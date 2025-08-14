#!/usr/bin/env node

/**
 * Configurable MCP server that provides access to Bluetext documentation resources,
 * and multirepo analysis resources. Configuration can be passed via environment variables
 * or MCP tools instead of requiring a config file.
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
import { createRequire } from "module";
import { mkdirSync } from "fs";
import { homedir } from "os";

// Multirepo imports
import { scanMultirepo, scanMultirepoWithChanges } from "./multirepo/scanner.js";
import { saveIndex, loadIndex } from "./multirepo/store.js";
import { generateMermaid } from "./multirepo/mermaid.js";
import { MultirepoConfig, MultirepoIndex } from "./types.js";
import { 
  RepositoryWatcher, 
  CHANGE_DETECTION_PRESETS 
} from "./multirepo/change-detection.js";

// Get the absolute path to the bluetext directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// Enable CommonJS-style require in ESM context where needed
const require = createRequire(import.meta.url);

/**
 * Load configuration from environment variables or use defaults
 */
function loadConfigFromEnv(): MultirepoConfig {
  const config: MultirepoConfig = {};

  // Parse repos from environment - this is the key part!
  const reposEnv = process.env.BLUETEXT_REPOS;
  if (reposEnv) {
    try {
      config.repos = JSON.parse(reposEnv);
    } catch (e) {
      console.warn("Failed to parse BLUETEXT_REPOS:", e);
    }
  }

  // Parse auto-discovery config from environment
  const autoDiscoveryEnv = process.env.BLUETEXT_AUTO_DISCOVERY;
  if (autoDiscoveryEnv) {
    try {
      config.autoDiscovery = JSON.parse(autoDiscoveryEnv);
    } catch (e) {
      console.warn("Failed to parse BLUETEXT_AUTO_DISCOVERY:", e);
    }
  }

  // Start with empty repos if none configured - no hardcoded defaults
  if (!config.repos) {
    config.repos = [];
  }

  // Simple defaults for other settings
  config.excludeGlobs = [
    "**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"
  ];
  config.includeFileExtensions = [
    ".ts", ".js", ".py", ".json", ".yaml", ".yml"
  ];
  config.indexPath = "multirepo-index.json";

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
async function scanAndPersist(workspaceName?: string) {
  const cfg = loadConfigFromEnv();
  const { index, summary } = await scanMultirepo(cfg);
  
  // If workspace name is provided, save to workspace-specific location
  if (workspaceName) {
    const workspaceIndexesPath = join(PROJECT_ROOT, "workspace-indexes");
    if (!existsSync(workspaceIndexesPath)) {
      mkdirSync(workspaceIndexesPath, { recursive: true });
    }
    const indexPath = join(workspaceIndexesPath, `${workspaceName}-index.json`);
    try {
      saveIndex(indexPath, index);
    } catch (error) {
      console.error(`Failed to save workspace index for ${workspaceName}:`, error);
    }
  } else if (cfg.indexPath) {
    try {
      saveIndex(cfg.indexPath, index);
    } catch {
      // ignore persistence failures in MVP
    }
  }
  return { cfg, index, summary };
}

/**
 * Load all workspace indexes from both local and centralized directories
 */
function loadAllWorkspaceIndexes(): Record<string, MultirepoIndex> {
  const workspaces: Record<string, MultirepoIndex> = {};
  
  // Load from local workspace-indexes directory
  const localWorkspaceIndexesPath = join(PROJECT_ROOT, "workspace-indexes");
  if (existsSync(localWorkspaceIndexesPath)) {
    try {
      const files = readdirSync(localWorkspaceIndexesPath);
      for (const file of files) {
        if (file.endsWith("-index.json")) {
          const workspaceName = file.replace("-index.json", "");
          const indexPath = join(localWorkspaceIndexesPath, file);
          const index = loadIndex(indexPath);
          if (index) {
            workspaces[workspaceName] = index;
          }
        }
      }
    } catch (error) {
      console.error("Error loading local workspace indexes:", error);
    }
  }
  
  // Load from centralized workspace directory
  const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
    join(homedir(), '.bluetext', 'workspaces');
  if (existsSync(centralWorkspaceDir)) {
    try {
      const files = readdirSync(centralWorkspaceDir);
      for (const file of files) {
        if (file.endsWith("-index.json")) {
          const workspaceName = file.replace("-index.json", "");
          const indexPath = join(centralWorkspaceDir, file);
          const index = loadIndex(indexPath);
          if (index) {
            // Don't overwrite if we already have this workspace from local
            if (!workspaces[workspaceName]) {
              workspaces[workspaceName] = index;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading centralized workspace indexes:", error);
    }
  }
  
  // Also check for any legacy index in the root and migrate it
  const defaultIndex = loadIndex("multirepo-index.json");
  if (defaultIndex) {
    // Extract workspace name from the repos if possible
    const repoNames = Object.values(defaultIndex.repos).map(r => r.name);
    const workspaceName = repoNames.length > 0 ? 
      repoNames[0].split('-')[0] || 'workspace' : 'workspace';
    const timestamp = new Date().getTime();
    const legacyWorkspaceName = `${workspaceName}-${timestamp}`;
    if (!workspaces[legacyWorkspaceName]) {
      workspaces[legacyWorkspaceName] = defaultIndex;
    }
  }
  
  return workspaces;
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
        name: "configure_repos",
        description: "Configure the repositories to scan (the key part - paths or URLs)",
        inputSchema: {
          type: "object",
          properties: {
            repos: {
              type: "array",
              description: "List of repositories to scan - the essential configuration",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Repository name" },
                  path: { type: "string", description: "Local path to repository (e.g., '../my-repo')" },
                  url: { type: "string", description: "Remote URL (e.g., 'https://github.com/user/repo')" }
                },
                required: ["name"],
                oneOf: [
                  { required: ["path"] },
                  { required: ["url"] }
                ]
              }
            }
          },
          required: ["repos"]
        }
      },
      {
        name: "auto_discover_repos",
        description: "Automatically discover project repositories from workspace roots",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoots: {
              type: "array",
              description: "Root directories to search for projects (defaults to current directory)",
              items: { type: "string" }
            },
            maxDepth: {
              type: "number",
              description: "Maximum directory depth to search (default: 3)",
              minimum: 1,
              maximum: 10
            },
            minConfidence: {
              type: "number", 
              description: "Minimum project confidence score 0-100 (default: 25)",
              minimum: 0,
              maximum: 100
            },
            includeHidden: {
              type: "boolean",
              description: "Include hidden directories in search (default: false)"
            }
          }
        }
      },
      {
        name: "scan_multirepo",
        description: "Scan the configured repositories and generate mermaid graph",
        inputSchema: {
          type: "object",
          properties: {}
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
    case "configure_repos": {
      const config = args as any;
      if (config?.repos) {
        process.env.BLUETEXT_REPOS = JSON.stringify(config.repos);
      }

      return {
        content: [
          {
            type: "text",
            text: `Repository configuration updated successfully!
            
**Configured ${config?.repos?.length || 0} repositories:**
${config?.repos?.map((r: any) => `- ${r.name}: ${r.path || r.url}`).join('\n') || 'None'}

You can now run scan_multirepo to analyze these repositories.`
          }
        ]
      };
    }

    case "auto_discover_repos": {
      try {
        const options = args as any;
        const {
          workspaceRoots = [process.cwd()],
          maxDepth = 3,
          minConfidence = 25,
          includeHidden = false
        } = options;

        // Set up auto-discovery configuration
        const autoConfig = {
          enabled: true,
          maxDepth,
          minConfidence,
          includeHidden,
          workspaceRoots
        };

        // Update environment config to enable auto-discovery
        const currentConfig = loadConfigFromEnv();
        const updatedConfig = {
          ...currentConfig,
          autoDiscovery: autoConfig
        };

        // Store updated config in environment (could be improved with persistent storage)
        process.env.BLUETEXT_AUTO_DISCOVERY = JSON.stringify(autoConfig);

        // Import and run discovery
        const { autoDiscoverProjects, getRepoName } = require('./multirepo/project-detection.js');
        
        let allProjects = [];
        for (const root of workspaceRoots) {
          const projects = autoDiscoverProjects(root, {
            maxDepth,
            minConfidence,
            includeHidden,
            excludePatterns: currentConfig.excludeGlobs || []
          });
          allProjects.push(...projects);
        }

        // Filter to only git repos
        const gitProjects = allProjects.filter(project => {
          const gitPath = join(project.path, '.git');
          return existsSync(gitPath);
        });

        const discoveredRepos = gitProjects.map(project => ({
          name: getRepoName(project),
          path: project.path,
          types: project.types,
          confidence: project.confidence
        }));

        return {
          content: [
            {
              type: "text",
              text: `Auto-discovery completed successfully!

**Discovery Summary:**
- Workspace roots searched: ${workspaceRoots.length}
- Projects discovered: ${allProjects.length}
- Git repositories found: ${gitProjects.length}
- Search depth: ${maxDepth}
- Minimum confidence: ${minConfidence}%

**Discovered Repositories:**
${discoveredRepos.map(repo => 
  `- **${repo.name}** (${repo.confidence}% confidence)
    - Path: \`${repo.path}\`
    - Types: ${repo.types.join(', ')}`
).join('\n\n')}

${discoveredRepos.length > 0 ? 
  'Use `scan_multirepo` to analyze these repositories and map their dependencies.' :
  'No git repositories found. Try adjusting maxDepth or minConfidence parameters.'
}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error during auto-discovery: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }

    case "scan_multirepo": {
      try {
        // Generate workspace name from repos being scanned
        const cfg = loadConfigFromEnv();
        const workspaceName = cfg.repos && cfg.repos.length > 0 ? 
          `scan-${cfg.repos[0].name || 'workspace'}-${Date.now()}` : 
          `scan-${Date.now()}`;
        
        const { index, summary } = await scanMultirepo(cfg);
        
        // Save to both local location and centralized location
        const localIndexPath = cfg.indexPath || "multirepo-index.json";
        saveIndex(localIndexPath, index);
        
        // Also save to centralized workspace indexes for the dashboard
        const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
          join(homedir(), '.bluetext', 'workspaces');
        if (!existsSync(centralWorkspaceDir)) {
          mkdirSync(centralWorkspaceDir, { recursive: true });
        }
        const centralIndexPath = join(centralWorkspaceDir, `${workspaceName}-index.json`);
        saveIndex(centralIndexPath, index);
        
        const mermaid = generateMermaid(index);
        
        return {
          content: [
            {
              type: "text",
              text: `Multirepo scan completed successfully!

**Scan Summary:**
- Repos scanned: ${summary.reposScanned}
- Files scanned: ${summary.filesScanned}
- Endpoints found: ${summary.endpointsFound}
- Usages found: ${summary.usagesFound}
- Duration: ${summary.durationMs} ms

**Mermaid Graph:**
\`\`\`mermaid
${mermaid}
\`\`\``
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
      const { index, summary } = await scanAndPersist();
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
      const { index } = await scanAndPersist();
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
      const { index } = await scanAndPersist();
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

      const { index } = await scanAndPersist();

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
  const port = parseInt(process.env.PORT || "3001", 10);
  const host = process.env.HOST || "localhost";
  
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
    } else if (req.method === "GET" && req.url === "/dashboard") {
      try {
        // Load all workspace indexes
        const workspaces = loadAllWorkspaceIndexes();
        
        // Calculate overall statistics across all workspaces
        let totalRepos = 0;
        let totalFiles = 0;
        let totalEndpoints = 0;
        let totalUsages = 0;
        let totalEdges = 0;
        
        for (const [name, index] of Object.entries(workspaces)) {
          totalRepos += Object.keys(index.repos).length;
          totalFiles += index.scanStats?.filesScanned || 0;
          totalEndpoints += Object.keys(index.endpoints).length;
          totalUsages += Object.keys(index.usages).length;
          totalEdges += index.edges.length;
        }
        
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bluetext Multirepo Dashboard</title>
            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 1400px; margin: 0 auto; }
              .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
              .stat-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
              .stat-number { font-size: 2em; font-weight: bold; color: #007acc; }
              .stat-label { color: #666; font-size: 0.9em; }
              .workspaces-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
              .workspace-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: inherit; display: block; }
              .workspace-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
              .workspace-icon { font-size: 3em; text-align: center; margin-bottom: 10px; }
              .workspace-name { font-size: 1.2em; font-weight: bold; color: #333; margin-bottom: 10px; text-align: center; }
              .workspace-stats { display: flex; justify-content: space-around; margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px; }
              .workspace-stat { text-align: center; }
              .workspace-stat-value { font-weight: bold; color: #007acc; font-size: 1.1em; }
              .workspace-stat-label { color: #666; font-size: 0.8em; }
              .scan-btn { background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-left: 10px; }
              .scan-btn:hover { background: #218838; }
              h1, h2 { color: #333; }
              .no-workspaces { text-align: center; color: #666; font-style: italic; padding: 40px; background: white; border-radius: 8px; }
              .actions { display: flex; gap: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔍 Bluetext Multirepo Dashboard</h1>
                <p>Cross-repository relationship analysis and visualization</p>
                <div class="actions">
                  <button class="scan-btn" onclick="scanWorkspace()">📊 Scan Current Workspace</button>
                  <button class="scan-btn" onclick="window.location.reload()">🔄 Refresh Dashboard</button>
                </div>
              </div>

              ${Object.keys(workspaces).length > 0 ? `
              <div class="stats">
                <div class="stat-card">
                  <div class="stat-number">${Object.keys(workspaces).length}</div>
                  <div class="stat-label">Workspaces</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${totalRepos}</div>
                  <div class="stat-label">Total Repositories</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${totalFiles}</div>
                  <div class="stat-label">Total Files Scanned</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${totalEndpoints}</div>
                  <div class="stat-label">Total API Endpoints</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${totalUsages}</div>
                  <div class="stat-label">Total API Usages</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${totalEdges}</div>
                  <div class="stat-label">Total Cross-Repo Relations</div>
                </div>
              </div>

              <h2>📁 Scanned Workspaces</h2>
              <div class="workspaces-grid">
                ${Object.entries(workspaces).map(([name, index]) => {
                  const repoCount = Object.keys(index.repos).length;
                  const endpointCount = Object.keys(index.endpoints).length;
                  const edgeCount = index.edges.length;
                  const scanTime = index.updatedAt || index.createdAt;
                  
                  // Format workspace name for display
                  const displayName = name.replace(/^scan-/, '').replace(/-\d+$/, '');
                  
                  return `
                    <a href="/workspace/${encodeURIComponent(name)}" class="workspace-card">
                      <div class="workspace-icon">📂</div>
                      <div class="workspace-name">${displayName}</div>
                      <div style="text-align: center; color: #666; font-size: 0.9em; margin-bottom: 10px;">
                        Last scan: ${new Date(scanTime).toLocaleString()}
                      </div>
                      <div class="workspace-stats">
                        <div class="workspace-stat">
                          <div class="workspace-stat-value">${repoCount}</div>
                          <div class="workspace-stat-label">Repos</div>
                        </div>
                        <div class="workspace-stat">
                          <div class="workspace-stat-value">${endpointCount}</div>
                          <div class="workspace-stat-label">Endpoints</div>
                        </div>
                        <div class="workspace-stat">
                          <div class="workspace-stat-value">${edgeCount}</div>
                          <div class="workspace-stat-label">Relations</div>
                        </div>
                      </div>
                    </a>
                  `;
                }).join('')}
              </div>
              ` : `
              <div class="no-workspaces">
                <h2>No Workspaces Scanned Yet</h2>
                <p>To analyze repositories, you need to use the MCP tools first:</p>
                <ol style="text-align: left; max-width: 600px; margin: 0 auto;">
                  <li><strong>Auto-discover repositories:</strong> Use <code>auto_discover_repos</code> tool</li>
                  <li><strong>Configure repositories:</strong> Use <code>configure_repos</code> tool</li>
                  <li><strong>Scan repositories:</strong> Use <code>scan_multirepo</code> tool</li>
                </ol>
                <p style="margin-top: 20px;">After scanning with MCP tools, workspaces will appear here as clickable folders.</p>
              </div>
              `}
            </div>

            <script>
              mermaid.initialize({ startOnLoad: true, theme: 'default' });
              
              async function scanWorkspace() {
                const name = prompt("Enter a name for this workspace scan:", "workspace-" + Date.now());
                if (name) {
                  const fullName = name.startsWith('scan-') ? name : 'scan-' + name;
                  const uniqueName = fullName + '-' + Date.now();
                  alert("Scanning workspace '" + name + "'... This may take a moment.");
                  window.location.href = '/scan/' + encodeURIComponent(uniqueName);
                }
              }
            </script>
          </body>
          </html>
        `);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bluetext Error</title>
          </head>
          <body>
            <h1>Error</h1>
            <p>Failed to generate dashboard: ${error instanceof Error ? error.message : String(error)}</p>
            <p><a href="/">Retry</a></p>
          </body>
          </html>
        `);
      }
    } else if (req.method === "GET" && req.url?.startsWith("/workspace/")) {
      // Individual workspace view
      try {
        const workspaceName = decodeURIComponent(req.url.substring("/workspace/".length));
        const workspaces = loadAllWorkspaceIndexes();
        const index = workspaces[workspaceName];
        
        if (!index) {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Workspace Not Found</title>
            </head>
            <body>
              <h1>Workspace Not Found</h1>
              <p>The workspace '${workspaceName}' was not found.</p>
              <p><a href="/dashboard">Back to Dashboard</a></p>
            </body>
            </html>
          `);
          return;
        }
        
        const mermaid = generateMermaid(index);
        const summary = index.scanStats || { filesScanned: 0, durationMs: 0 };
        
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${workspaceName} - Bluetext Workspace</title>
            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 1200px; margin: 0 auto; }
              .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .breadcrumb { color: #666; margin-bottom: 10px; }
              .breadcrumb a { color: #007acc; text-decoration: none; }
              .breadcrumb a:hover { text-decoration: underline; }
              .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
              .stat-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
              .stat-number { font-size: 2em; font-weight: bold; color: #007acc; }
              .stat-label { color: #666; font-size: 0.9em; }
              .graph-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .repos-list { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .repo-item { padding: 10px; border-left: 4px solid #007acc; margin: 10px 0; background: #f8f9fa; }
              .repo-name { font-weight: bold; color: #333; }
              .repo-details { color: #666; font-size: 0.9em; margin-top: 5px; }
              .edges-list { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
              .edge-item { padding: 8px; border-bottom: 1px solid #eee; }
              .mermaid { text-align: center; }
              h1, h2 { color: #333; }
              .no-data { text-align: center; color: #666; font-style: italic; }
              .back-btn { background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
              .back-btn:hover { background: #005a9e; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="breadcrumb">
                  <a href="/dashboard">Dashboard</a> / ${workspaceName.replace(/^scan-/, '').replace(/-\d+$/, '')}
                </div>
                <h1>📂 ${workspaceName.replace(/^scan-/, '').replace(/-\d+$/, '')}</h1>
                <p>Repository relationship analysis for this workspace</p>
                <p style="color: #666; font-size: 0.9em;">
                  Last scanned: ${new Date(index.updatedAt || index.createdAt).toLocaleString()}
                </p>
              </div>

              <div class="stats">
                <div class="stat-card">
                  <div class="stat-number">${Object.keys(index.repos).length}</div>
                  <div class="stat-label">Repositories</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${summary.filesScanned || 0}</div>
                  <div class="stat-label">Files Scanned</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${Object.keys(index.endpoints).length}</div>
                  <div class="stat-label">API Endpoints</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${Object.keys(index.usages).length}</div>
                  <div class="stat-label">API Usages</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${index.edges.length}</div>
                  <div class="stat-label">Cross-Repo Relations</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${summary.durationMs || 0}ms</div>
                  <div class="stat-label">Scan Duration</div>
                </div>
              </div>

              <div class="graph-container">
                <h2>📊 Repository Relationship Graph</h2>
                ${index.edges.length > 0 ? 
                  `<div class="mermaid">${mermaid}</div>` :
                  '<div class="no-data">No cross-repository relationships found. This could mean:<br/>• Repositories are independent<br/>• API calls use external services<br/>• Different communication patterns are used</div>'
                }
              </div>

              ${index.edges.length > 0 ? `
              <div class="edges-list">
                <h2>🔗 Cross-Repository Relationships</h2>
                ${index.edges.sort((a, b) => b.count - a.count).slice(0, 10).map(edge => `
                  <div class="edge-item">
                    <strong>${index.repos[edge.fromRepoId]?.name || edge.fromRepoId}</strong> 
                    → <strong>${index.repos[edge.toRepoId]?.name || edge.toRepoId}</strong>
                    <br/>
                    <span style="color: #666;">
                      ${edge.label} (${edge.count} call${edge.count !== 1 ? 's' : ''})
                    </span>
                  </div>
                `).join('')}
                ${index.edges.length > 10 ? `<div class="no-data">... and ${index.edges.length - 10} more relationships</div>` : ''}
              </div>
              ` : ''}

              <div class="repos-list">
                <h2>📁 Repository Details</h2>
                ${Object.values(index.repos).map(repo => {
                  const endpoints = Object.values(index.endpoints).filter(e => e.repoId === repo.id);
                  const usages = Object.values(index.usages).filter(u => u.repoId === repo.id);
                  return `
                    <div class="repo-item">
                      <div class="repo-name">${repo.name}</div>
                      <div class="repo-details">
                        📂 ${repo.path}<br/>
                        💻 Languages: ${repo.detectedLanguages?.join(', ') || 'Unknown'}<br/>
                        🔌 ${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}, 
                        📞 ${usages.length} usage${usages.length !== 1 ? 's' : ''}
                        ${repo.headCommit ? `<br/>📝 Latest commit: ${repo.headCommit.slice(0, 8)}` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div style="margin-top: 20px;">
                <a href="/dashboard" class="back-btn">← Back to Dashboard</a>
              </div>
            </div>

            <script>
              mermaid.initialize({ startOnLoad: true, theme: 'default' });
            </script>
          </body>
          </html>
        `);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bluetext Error</title>
          </head>
          <body>
            <h1>Error</h1>
            <p>Failed to load workspace: ${error instanceof Error ? error.message : String(error)}</p>
            <p><a href="/dashboard">Back to Dashboard</a></p>
          </body>
          </html>
        `);
      }
    } else if (req.method === "GET" && req.url?.startsWith("/scan/")) {
      // Scan a workspace and redirect to its view
      try {
        const fullWorkspaceName = decodeURIComponent(req.url.substring("/scan/".length));
        console.log(`Scanning workspace: ${fullWorkspaceName}`);
        
        // Load current config and scan
        const cfg = loadConfigFromEnv();
        
        // Check if there are any repos configured
        if (!cfg.repos || cfg.repos.length === 0) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>No Repositories Configured</title>
            </head>
            <body>
              <h1>No Repositories Configured</h1>
              <p>No repositories are configured for scanning. Please use the MCP tools to configure repositories first:</p>
              <ol>
                <li>Use <code>auto_discover_repos</code> to find repositories</li>
                <li>Use <code>configure_repos</code> to set up the repositories</li>
                <li>Use <code>scan_multirepo</code> to perform the analysis</li>
              </ol>
              <p><a href="/dashboard">Back to Dashboard</a></p>
            </body>
            </html>
          `);
          return;
        }
        
        const { index, summary } = await scanMultirepo(cfg);
        
        // Save to workspace-specific location
        const workspaceIndexesPath = join(PROJECT_ROOT, "workspace-indexes");
        if (!existsSync(workspaceIndexesPath)) {
          mkdirSync(workspaceIndexesPath, { recursive: true });
        }
        const indexPath = join(workspaceIndexesPath, `${fullWorkspaceName}-index.json`);
        saveIndex(indexPath, index);
        console.log(`Saved workspace index to: ${indexPath}`);
        
        res.writeHead(302, { "Location": `/workspace/${encodeURIComponent(fullWorkspaceName)}` });
        res.end();
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scan Error</title>
          </head>
          <body>
            <h1>Scan Error</h1>
            <p>Failed to scan workspace: ${error instanceof Error ? error.message : String(error)}</p>
            <p><a href="/dashboard">Back to Dashboard</a></p>
          </body>
          </html>
        `);
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
      res.writeHead(302, { "Location": "/dashboard" });
      res.end();
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });
  
  httpServer.listen(port, host, () => {
    console.log(`Bluetext MCP Server running on http://${host}:${port}`);
    console.log("Use MCP tools to configure repositories and scan");
    const config = loadConfigFromEnv();
    console.log(`Current repos: ${config.repos?.map(r => r.name).join(', ') || 'none'}`);
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
