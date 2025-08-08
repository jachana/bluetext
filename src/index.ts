#!/usr/bin/env node

/**
 * MCP server that provides access to Bluetext documentation resources.
 * It serves documentation files from the polytope, code-gen-modules, and blueprints directories.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Get the absolute path to the bluetext directory
// This works by finding the directory containing this script file and going up to the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

/**
 * Get the list of available code generation modules
 */
function getCodeGenModules(): string[] {
  try {
    const codeGenModulesPath = join(PROJECT_ROOT, "code-gen-modules");
    const moduleFiles = readdirSync(codeGenModulesPath);
    return moduleFiles
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch (error) {
    return [];
  }
}

/**
 * Build index mapping canonical Polytope module IDs (from markdown H1) to file basenames.
 * This allows module IDs like "redpanda!console" to be served from files like "redpanda-console.md".
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
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    return [];
  }
}

/**
 * Get the list of available standard modules
 */
function getStandardModules(): string[] {
  try {
    const standardModulesPath = join(PROJECT_ROOT, "polytope", "standard-modules");
    const moduleFiles = readdirSync(standardModulesPath);
    return moduleFiles
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch (error) {
    return [];
  }
}

/**
 * Create an MCP server with capabilities for resources only.
 * This server provides access to documentation files.
 */
const server = new Server(
  {
    name: "bluetext",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
    },
  }
);

/**
 * Handler for listing available documentation resources.
 * Provides access to:
 * - /intro (intro.md) - Main Bluetext documentation overview
 * - /polytope-docs (polytope/intro.md)
 * - /code-gen-modules/<module-id> (code-gen-modules/<module-id>.md)
 * - /blueprints (blueprints/intro.md)
 * - /blueprints/<blueprint-id> (blueprints/<blueprint-id>/intro.md)
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
      description: "Main overview and quick start guide for Bluetext framework"
    });
  }

  // Add polytope docs resource
  const polytopeDocsPath = join(PROJECT_ROOT, "polytope", "intro.md");
  if (existsSync(polytopeDocsPath)) {
    resources.push({
      uri: "bluetext://polytope-docs",
      mimeType: "text/markdown",
      name: "Polytope Documentation",
      description: "Comprehensive documentation about Polytope platform"
    });
  }

  // Add code generation modules
  const codeGenModules = getCodeGenModules();
  for (const moduleId of codeGenModules) {
    resources.push({
      uri: `bluetext://code-gen-modules/${moduleId}`,
      mimeType: "text/markdown",
      name: `Code Gen Module: ${moduleId}`,
      description: `Documentation for ${moduleId} code generation module`
    });
  }

  // Add blueprints intro
  const blueprintsIntroPath = join(PROJECT_ROOT, "blueprints", "intro.md");
  if (existsSync(blueprintsIntroPath)) {
    resources.push({
      uri: "bluetext://blueprints",
      mimeType: "text/markdown",
      name: "Blueprints Documentation",
      description: "Introduction to Bluetext blueprints"
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
        description: `Documentation for ${blueprintId} blueprint`
      });
    }
  }

  // Add standard modules (use canonical IDs parsed from markdown H1)
  const stdIndex = getStandardModuleIndex();
  for (const moduleId of Object.keys(stdIndex)) {
    const fileBase = stdIndex[moduleId];
    const modulePath = join(PROJECT_ROOT, "polytope", "standard-modules", `${fileBase}.md`);
    if (existsSync(modulePath)) {
      resources.push({
        uri: `bluetext://polytope/standard-modules/${moduleId}`,
        mimeType: "text/markdown",
        name: `Polytope Module: polytope/${moduleId}`,
        description: `Documentation for built-in Polytope module polytope/${moduleId}`
      });
    }
  }

  return { resources };
});

/**
 * Handler for reading the contents of documentation resources.
 * Supports the following URI patterns:
 * - bluetext://intro
 * - bluetext://polytope-docs
 * - bluetext://code-gen-modules/<module-id>
 * - bluetext://blueprints
 * - bluetext://blueprints/<blueprint-id>
 * - bluetext://polytope/standard-modules/<module-id>
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  
  // Parse the custom URI scheme: bluetext://resource-path
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
      const stdIndex = getStandardModuleIndex();
      const fileBase = stdIndex[moduleId] ?? moduleId.replace(/!/g, "-");
      filePath = join(PROJECT_ROOT, "polytope", "standard-modules", `${fileBase}.md`);
    } else {
      throw new Error(`Unknown resource path: ${resourcePath}`);
    }

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    content = readFileSync(filePath, "utf-8");

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "text/markdown",
        text: content
      }]
    };
  } catch (error) {
    throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
