#!/usr/bin/env node

/**
 * Configurable MCP server that provides access to Bluetext documentation resources,
 * and multirepo analysis resources. Configuration can be passed via environment variables
 * or initialization parameters instead of requiring a config file.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createServer, IncomingMessage, ServerResponse } from "http";

// Multirepo imports
import { scanMultirepo } from "./multirepo/scanner.js";
import { saveIndex } from "./multirepo/store.js";
import { generateMermaid } from "./multirepo/mermaid.js";
import { MultirepoConfig } from "./types.js";

// Get the absolute path to the bluetext directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

/**
 * Load configuration from environment variables or use defaults
 */
function loadConfigFromEnv(): MultirepoConfig {
  const config: MultirepoConfig = {};

  // Parse repos from environment
  const reposEnv = process.env.BLUETEXT_REPOS;
  if (reposEnv) {
    try {
      config.repos = JSON.parse(reposEnv);
    } catch (e) {
      console.warn("Failed to parse BLUETEXT_REPOS:", e);
    }
  }

  // Parse exclude globs
  const excludeGlobsEnv = process.env.BLUETEXT_EXCLUDE_GLOBS;
  if (excludeGlobsEnv) {
    try {
      config.excludeGlobs = JSON.parse(excludeGlobsEnv);
    } catch (e) {
      config.excludeGlobs = excludeGlobsEnv.split(',').map(s => s.trim());
    }
  }

  // Parse include file extensions
  const includeExtensionsEnv = process.env.BLUETEXT_INCLUDE_EXTENSIONS;
  if (includeExtensionsEnv) {
    try {
      config.includeFileExtensions = JSON.parse(includeExtensionsEnv);
    } catch (e) {
      config.includeFileExtensions = includeExtensionsEnv.split(',').map(s => s.trim());
    }
  }

  // Parse URL bases
  const urlBasesEnv = process.env.BLUETEXT_URL_BASES;
  if (urlBasesEnv) {
    try {
      config.urlBases = JSON.parse(urlBasesEnv);
    } catch (e) {
      console.warn("Failed to parse BLUETEXT_URL_BASES:", e);
    }
  }

  // Index path
  const indexPathEnv = process.env.BLUETEXT_INDEX_PATH;
  if (indexPathEnv) {
    config.indexPath = indexPathEnv;
  }

  // Apply defaults if not provided
  if (!config.repos || config.repos.length === 0) {
    config.repos = [
      { "name": "demo-transaction-service", "path": "../demo-transaction-service" },
      { "name": "demo-payment-service", "path": "../demo-payment-service" },
      { "name": "demo-user-service", "path": "../demo-user-service" }
    ];
  }

  if (!config.excludeGlobs) {
    config.excludeGlobs = [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/.venv/**",
      "**/.idea/**",
      "**/.vscode/**"
    ];
  }

  if (!config.includeFileExtensions) {
    config.includeFileExtensions = [
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
      ".py", ".pyx", ".pyi",
      ".go", ".mod",
      ".java", ".kt", ".scala",
      ".cs", ".fs", ".vb",
      ".rb", ".php", ".swift",
      ".rs", ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp",
      ".json", ".yaml", ".yml", ".toml", ".xml",
      ".proto", ".graphql", ".sql"
    ];
  }

  if (!config.urlBases) {
    config.urlBases = [
      { "name": "payment-service", "repo": "demo-payment-service", "baseUrl": "http://payment-service:3002" },
      { "name": "transaction-service", "repo": "demo-transaction-service", "baseUrl": "http://transaction-service:3003" },
      { "name": "user-service", "repo": "demo-user-service", "baseUrl": "http://user-service:3001" },
      { "name": "payment-localhost", "repo": "demo-payment-service", "baseUrl": "http://localhost:3002" },
      { "name": "transaction-localhost", "repo": "demo-transaction-service", "baseUrl": "http://localhost:3003" },
      { "name": "user-localhost", "repo": "demo-user-service", "baseUrl": "http://localhost:3001" }
    ];
  }

  if (!config.indexPath) {
    config.indexPath = "multirepo-index.json";
  }

  return config;
}

/**
 * Get the list of available code generation modules
 */
function getCodeGenModules(): string[] {
  try {
    const codeGenModulesPath = join(PROJECT_ROOT, "code-gen-modules");
    const moduleFiles = readdirSync(codeGenModulesPath);
    return moduleFiles
      .filter((file) => file.endsWith(".md"))
      .map((file) => file.replace(".md", ""));
  } catch {
    return [];
  }
}

/**
 * Build index mapping canonical Polytope module IDs (from markdown H1) to file basenames.
 */
function getStandardModuleIndex(): Record<string, string> {
  const index: Record<string, string> = {};
  try {
    const standardModulesPath = join(PROJECT_ROOT, "polytope", "standard-modules");
    const moduleFiles = readdirSync(standardModulesPath).filter((f) => f.endsWith(".md"));
    for (const file of moduleFiles) {
      const base = file.replace(".md", "");
      const path = join(standardModulesPath, file);
      let canonical = base;
      try {
        const text = readFileSync(path, "utf-8");
        const m = text.match(/^#\s+polytope\/([^\s]+)\s*$/m);
        if (m) canonical = m[1];
      } catch {
        // ignore read errors for individual files
      }
      index[canonical] = base;
    }
  } catch {
    // ignore if directory doesn't exist
  }
  return index;
}

/**
 * Get the list of available blueprints
 */
function getBlueprints(): string[] {
  try {
    const blueprintsPath = join(PROJECT_ROOT, "blueprints");
    const blueprintDirs = readdirSync(blueprintsPath, { withFileTypes: true });
    return blueprintDirs
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  } catch {
    return [];
  }
}

/**
 * Run a multirepo scan and persist the index to the configured indexPath.
 */
function scanAndPersist() {
  const cfg = loadConfigFromEnv();
  const { index, summary } = scanMultirepo(cfg);
  if (cfg.indexPath) {
    try {
      saveIndex(cfg.indexPath, index);
    } catch {
      // ignore persistence failures in MVP
    }
  }
  return { cfg, index, summary };
}

/**
 * Create an MCP server with capabilities for resources and tools.
 */
const server = new Server(
  {
    name: "bluetext",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler for listing available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "configure_multirepo",
        description: "Configure the multirepo scanner with repositories, exclude patterns, and URL bases",
        inputSchema: {
          type: "object",
          properties: {
            repos: {
              type: "array",
              description: "List of repositories to scan",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Repository name" },
                  path: { type: "string", description: "Local path to repository" },
                  url: { type: "string", description: "Optional remote URL" },
                  branch: { type: "string", description: "Optional branch name" }
                },
                required: ["name", "path"]
              }
            },
            excludeGlobs: {
              type: "array",
              description: "Glob patterns to exclude from scanning",
              items: { type: "string" }
            },
            includeFileExtensions: {
              type: "array",
              description: "File extensions to include in scanning",
              items: { type: "string" }
            },
            urlBases: {
              type: "array",
              description: "URL base mappings for connecting usages to endpoints",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Base name" },
                  repo: { type: "string", description: "Repository name" },
                  baseUrl: { type: "string", description: "Base URL" }
                },
                required: ["baseUrl"]
              }
            },
            indexPath: {
              type: "string",
              description: "Path to save the multirepo index"
            }
          }
        }
      },
      {
        name: "scan_multirepo",
        description: "Scan the configured repositories and generate cross-repo analysis",
        inputSchema: {
          type: "object",
          properties: {
            forceRescan: {
              type: "boolean",
              description: "Force a fresh scan even if cache exists",
              default: false
            }
          }
        }
      }
    ]
  };
});

/**
 * Handler for tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "configure_multirepo": {
      const config = args as any;
      // Set environment variables based on the configuration
      if (config?.repos) {
        process.env.BLUETEXT_REPOS = JSON.stringify(config.repos);
      }
      if (config?.excludeGlobs) {
        process.env.BLUETEXT_EXCLUDE_GLOBS = JSON.stringify(config.excludeGlobs);
      }
      if (config?.includeFileExtensions) {
        process.env.BLUETEXT_INCLUDE_EXTENSIONS = JSON.stringify(config.includeFileExtensions);
      }
      if (config?.urlBases) {
        process.env.BLUETEXT_URL_BASES = JSON.stringify(config.urlBases);
      }
      if (config?.indexPath) {
        process.env.BLUETEXT_INDEX_PATH = config.indexPath;
      }

      return {
        content: [
          {
            type: "text",
            text: `Multirepo configuration updated successfully. Configuration includes:
- ${config?.repos?.length || 0} repositories
- ${config?.excludeGlobs?.length || 0} exclude patterns
- ${config?.includeFileExtensions?.length || 0} file extensions
- ${config?.urlBases?.length || 0} URL base mappings`
          }
        ]
      };
    }

    case "scan_multirepo": {
      try {
        const { cfg, index, summary } = scanAndPersist();
        const mermaid = generateMermaid(index);
        
        return {
          content: [
            {
              type: "text",
              text: `Multirepo scan completed successfully!

**Scan Summary:**
- Repos scanned: ${summary.reposScanned} (discovered: ${summary.reposDiscovered})
- Files scanned: ${summary.filesScanned}
- Endpoints found: ${summary.endpointsFound}
- Usages found: ${summary.usagesFound}
- Duration: ${summary.durationMs} ms

**Mermaid Graph:**
\`\`\`mermaid
${mermaid}
\`\`\`

The scan results have been saved to: ${cfg.indexPath}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error during multirepo scan: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Handler for listing available documentation and multirepo resources.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [];

  // Add main intro resource
  const mainIntroPath = join(PROJECT_ROOT, "intro.md");
  if (existsSync(mainIntroPath)) {
    resources.push({
      uri: "bluetext://intro",
      mimeType: "text/markdown",
      name: "Bluetext Documentation",
      description: "Main overview and quick start guide for Bluetext framework",
    });
  }

  // Add polytope docs resource
  const polytopeDocsPath = join(PROJECT_ROOT, "polytope", "intro.md");
  if (existsSync(polytopeDocsPath)) {
    resources.push({
      uri: "bluetext://polytope-docs",
      mimeType: "text/markdown",
      name: "Polytope Documentation",
      description: "Comprehensive documentation about Polytope platform",
    });
  }

  // Add code generation modules
  const codeGenModules = getCodeGenModules();
  for (const moduleId of codeGenModules) {
    resources.push({
      uri: `bluetext://code-gen-modules/${moduleId}`,
      mimeType: "text/markdown",
      name: `Code Gen Module: ${moduleId}`,
      description: `Documentation for ${moduleId} code generation module`,
    });
  }

  // Add blueprints intro
  const blueprintsIntroPath = join(PROJECT_ROOT, "blueprints", "intro.md");
  if (existsSync(blueprintsIntroPath)) {
    resources.push({
      uri: "bluetext://blueprints",
      mimeType: "text/markdown",
      name: "Blueprints Documentation",
      description: "Introduction to Bluetext blueprints",
    });
  }

  // Add individual blueprints
  const blueprints = getBlueprints();
  for (const blueprintId of blueprints) {
    const blueprintPath = join(PROJECT_ROOT, "blueprints", blueprintId, "intro.md");
    if (existsSync(blueprintPath)) {
      resources.push({
        uri: `bluetext://blueprints/${blueprintId}`,
        mimeType: "text/markdown",
        name: `Blueprint: ${blueprintId}`,
        description: `Documentation for ${blueprintId} blueprint`,
      });
    }
  }

  // Add standard modules
  const stdIndex = getStandardModuleIndex();
  for (const moduleId of Object.keys(stdIndex)) {
    const fileBase = stdIndex[moduleId];
    const modulePath = join(PROJECT_ROOT, "polytope", "standard-modules", `${fileBase}.md`);
    if (existsSync(modulePath)) {
      resources.push({
        uri: `bluetext://polytope/standard-modules/${moduleId}`,
        mimeType: "text/markdown",
        name: `Polytope Module: polytope/${moduleId}`,
        description: `Documentation for built-in Polytope module polytope/${moduleId}`,
      });
    }
  }

  // Add multirepo analysis top-level resources
  resources.push({
    uri: "bluetext://multirepo/config",
    mimeType: "application/json",
    name: "Multirepo Config",
    description: "Current multirepo configuration",
  });
  resources.push({
    uri: "bluetext://multirepo/summary",
    mimeType: "text/markdown",
    name: "Multirepo Summary",
    description: "Human-readable summary of the latest multirepo scan with a mermaid graph",
  });
  resources.push({
    uri: "bluetext://multirepo/index.json",
    mimeType: "application/json",
    name: "Multirepo Index",
    description: "Raw multirepo index JSON (repos, endpoints, usages, edges)",
  });
  resources.push({
    uri: "bluetext://multirepo/graph.mmd",
    mimeType: "text/plain",
    name: "Multirepo Graph (Mermaid)",
    description: "Cross-repo relation graph in Mermaid format",
  });

  return { resources };
});

/**
 * Handler for reading the contents of documentation and multirepo resources.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (!uri.startsWith("bluetext://")) {
    throw new Error(`Unsupported URI scheme: ${uri}`);
  }

  const resourcePath = uri.replace("bluetext://", "");
  let filePath: string;
  let content: string;

  try {
    if (resourcePath === "intro") {
      filePath = join(PROJECT_ROOT, "intro.md");
    } else if (resourcePath === "polytope-docs") {
      filePath = join(PROJECT_ROOT, "polytope", "intro.md");
    } else if (resourcePath === "blueprints") {
      filePath = join(PROJECT_ROOT, "blueprints", "intro.md");
    } else if (resourcePath.startsWith("code-gen-modules/")) {
      const moduleId = resourcePath.replace("code-gen-modules/", "");
      filePath = join(PROJECT_ROOT, "code-gen-modules", `${moduleId}.md`);
    } else if (resourcePath.startsWith("blueprints/")) {
      const blueprintId = resourcePath.replace("blueprints/", "");
      filePath = join(PROJECT_ROOT, "blueprints", blueprintId, "intro.md");
    } else if (resourcePath.startsWith("polytope/standard-modules/")) {
      const moduleId = resourcePath.replace("polytope/standard-modules/", "");
      filePath = join(PROJECT_ROOT, "polytope", "standard-modules", `${moduleId}.md`);
    } else if (resourcePath === "multirepo/config") {
      const cfg = loadConfigFromEnv();
      content = JSON.stringify(cfg, null, 2);
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: content,
          },
        ],
      };
    } else if (resourcePath === "multirepo/summary") {
      const { index, summary } = scanAndPersist();
      const mermaid = generateMermaid(index);
      const md = [
        "# Multirepo Scan Summary",
        "",
        `- Repos scanned: ${summary.reposScanned} (discovered: ${summary.reposDiscovered})`,
        `- Files scanned: ${summary.filesScanned}`,
        `- Endpoints found: ${summary.endpointsFound}`,
        `- Usages found: ${summary.usagesFound}`,
        `- Duration: ${summary.durationMs} ms`,
        "",
        "## Top Relations",
      ];
      const topEdges = [...index.edges].sort((a, b) => b.count - a.count).slice(0, 20);
      if (topEdges.length === 0) {
        md.push("_No cross-repo edges found._");
      } else {
        for (const e of topEdges) {
          md.push(
            `- ${index.repos[e.fromRepoId]?.name || e.fromRepoId} -> ${
              index.repos[e.toRepoId]?.name || e.toRepoId
            }: "${e.label}" (count: ${e.count})`
          );
        }
      }
      md.push("", "## Graph (Mermaid)", "", "```mermaid", mermaid, "```");
      content = md.join("\n");
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/markdown",
            text: content,
          },
        ],
      };
    } else if (resourcePath === "multirepo/index.json") {
      const { index } = scanAndPersist();
      content = JSON.stringify(index, null, 2);
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: content,
          },
        ],
      };
    } else if (resourcePath === "multirepo/graph.mmd") {
      const { index } = scanAndPersist();
      content = generateMermaid(index);
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/plain",
            text: content,
          },
        ],
      };
    } else if (resourcePath.startsWith("multirepo/repo/")) {
      const sub = resourcePath.substring("multirepo/repo/".length);
      const parts = sub.split("/");
      const repoId = parts[0];
      const kind = parts.slice(1).join("/");

      const { index } = scanAndPersist();

      if (kind === "endpoints.json") {
        const endpoints = Object.values(index.endpoints).filter((e) => e.repoId === repoId);
        content = JSON.stringify(endpoints, null, 2);
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: "application/json",
              text: content,
            },
          ],
        };
      } else if (kind === "usages.json") {
        const usages = Object.values(index.usages).filter((u) => u.repoId === repoId);
        content = JSON.stringify(usages, null, 2);
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: "application/json",
              text: content,
            },
          ],
        };
      } else {
        throw new Error(`Unknown multirepo repo resource path: ${resourcePath}`);
      }
    } else {
      throw new Error(`Unknown resource path: ${resourcePath}`);
    }

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    content = readFileSync(filePath, "utf-8");

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/markdown",
          text: content,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * Start the server using SSE transport for remote deployment.
 */
async function main() {
  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "0.0.0.0";
  
  const transports: { [sessionId: string]: SSEServerTransport } = {};

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.method === "GET" && req.url === "/sse") {
      const transport = new SSEServerTransport("/message", res);
      transports[transport.sessionId] = transport;
      await server.connect(transport);
    } else if (req.method === "POST" && req.url?.startsWith("/message")) {
      const sessionId = new URL(req.url, `http://${req.headers.host}`).searchParams.get("sessionId");
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handlePostMessage(req, res);
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No transport found for sessionId" }));
      }
    } else if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        status: "healthy", 
        server: "bluetext-mcp", 
        version: "0.1.0",
        timestamp: new Date().toISOString(),
        config: loadConfigFromEnv()
      }));
    } else if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bluetext MCP Server</title>
        </head>
        <body>
          <h1>Bluetext MCP Server</h1>
          <p>Configurable multirepo analysis server</p>
          <p>Status: Running</p>
          <p>Configuration: Environment-based</p>
        </body>
        </html>
      `);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });
  
  httpServer.listen(port, host, () => {
    console.log(`Bluetext MCP Server running on http://${host}:${port}`);
    console.log("Configuration loaded from environment variables");
    const config = loadConfigFromEnv();
    console.log(`- ${config.repos?.length || 0} repositories configured`);
    console.log(`- ${config.excludeGlobs?.length || 0} exclude patterns`);
    console.log(`- ${config.includeFileExtensions?.length || 0} file extensions`);
  });
  
  process.on("SIGINT", () => {
    httpServer.close(() => process.exit(0));
  });
  
  process.on("SIGTERM", () => {
    httpServer.close(() => process.exit(0));
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
