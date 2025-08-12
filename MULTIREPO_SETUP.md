# Bluetext Multirepo MCP: Setup & Usage Guide

This guide explains how to set up the Bluetext MCP server for a new project and how to make use of its multirepo analysis features to understand relations between different repositories.

## What you get

The Bluetext MCP server provides resource endpoints that:
- Scan one or more repos to detect API endpoints and outbound HTTP usages
- Infer cross-repo relations (who calls whom)
- Generate a Mermaid graph and a human-readable summary
- Expose documentation resources

It produces and uses a local cache file (`multirepo-index.json`) so you can quickly query relations without re-parsing everything on each request.

## Prerequisites

- Node.js 18+ and npm
- A set of local git repositories you want to analyze (monorepo or multiple sibling repos)
- An MCP-compatible client (e.g., an IDE extension, tool, or the MCP Inspector)

## Install and build

1) Clone or download this repo
2) Install dependencies
   - `npm install`
3) Build the server
   - `npm run build`

This compiles TypeScript to `build/index.js`, which is the binary entry for the MCP server.

## Add the server to your MCP client

Point your MCP client to execute the built server:

- Command: `node c:/absolute/path/to/bluetext/build/index.js` (use your actual path)
- Transport: stdio (default)

Examples:
- Windows: `node C:\Users\you\dev\bluetext\build\index.js`
- macOS/Linux: `node /Users/you/dev/bluetext/build/index.js`

If your client supports multiple servers, add “bluetext” as a new server entry.

Tip: You can test locally with the MCP Inspector:
- `npm run inspector`
This launches the official MCP Inspector UI wired to `build/index.js`.

## Configure which repos to scan

Create a `multirepo.config.json` next to `build/index.js` (project root). You can also point to a different config via `BLUETEXT_MULTIREPO_CONFIG` (see Advanced).

Minimal example (explicit repos):
```json
{
  "repos": [
    { "name": "users-service", "path": "../users-service" },
    { "name": "payments-service", "path": "../payments-service" },
    { "name": "transactions-service", "path": "../transactions-service" }
  ],
  "excludeGlobs": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.venv/**",
    "**/.idea/**",
    "**/.vscode/**"
  ],
  "includeFileExtensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".json", ".yaml", ".yml"],
  "urlBases": [
    { "name": "payments", "repo": "payments-service", "baseUrl": "/${PAYMENT_SERVICE_URL}" },
    { "name": "transactions", "repo": "transactions-service", "baseUrl": "/${TRANSACTION_SERVICE_URL}" },
    { "name": "users", "repo": "users-service", "baseUrl": "/${USER_SERVICE_URL}" }
  ],
  "indexPath": "multirepo-index.json"
}
```

Alternate: auto-discover repos under one or more roots (useful in monorepos or a workspace folder):
```json
{
  "roots": ["../my-workspace"],
  "excludeGlobs": ["**/node_modules/**", "**/.git/**"],
  "includeFileExtensions": [".ts", ".js", ".py"],
  "indexPath": "multirepo-index.json"
}
```

Configuration fields:
- repos: Explicit list of repos (local paths). Prefer this for maximum control.
- roots: Directory roots to recursively scan for git repos if `repos` is omitted.
- urlBases: Hints to map outbound calls to provider repos when URLs include environment-variable-like prefixes (e.g. "/${PAYMENT_SERVICE_URL}/users/123"). The scanner canonicalizes path segments like parameters and ${VARS} to improve matching.
- featureGlobs: Optional tags to label files/endpoints with a “feature” name.
- excludeGlobs: File/folder patterns to skip (node_modules, .git, etc).
- includeFileExtensions: Extensions to parse for endpoints/usages.
- indexPath: Where to persist the generated index (cache). Relative paths are resolved against the config file directory.

Notes:
- Paths in `repos[].path` or `roots[]` can be relative; they are resolved against the config location.
- The scanner supports common web stacks out-of-the-box:
  - Endpoints: Express/Fastify (`app.get('/path')`), Flask (`@app.route`), FastAPI (`@app.get`), NestJS (`@Get('/path')`), OpenAPI JSON files
  - Usages: fetch(...), axios.get/post(...), axios(...), http(s).request(...), Python requests.get/post(...)

## Running a scan and using results

You do not run a separate “scan” command. The MCP server performs a scan on demand when you read multirepo resources. Use your MCP client to read these URIs:

- bluetext://multirepo/summary
  - Human-readable scan summary with top relations and an embedded Mermaid graph
- bluetext://multirepo/index.json
  - Raw index JSON: repos, endpoints, usages, edges, stats
- bluetext://multirepo/graph.mmd
  - Mermaid diagram that you can copy into a Mermaid renderer
- bluetext://multirepo/repo/<repoId>/endpoints.json
  - All detected endpoints for a repo
- bluetext://multirepo/repo/<repoId>/usages.json
  - All detected outbound usages for a repo

How to read resources depends on your MCP client. In the MCP Inspector, use the “Read Resource” action and paste the URI. In integrated IDE clients, select resources from the server’s resource list.

## Understanding multirepo-index.json

- Purpose: A local cache/artifact produced by scans for faster subsequent reads.
- Contents: Machine-specific data (absolute paths, local repo ids/names, head commit SHAs, detected languages, endpoints, usages, cross-repo edges, scan stats).
- Portability: This file is specific to your environment by design and should not be committed.
- Status: Already ignored in `.gitignore`.

Regenerating: Reading `bluetext://multirepo/index.json`, `summary`, or `graph.mmd` will re-scan and re-persist the index to the configured `indexPath`.

## Making the most of urlBases

If your code builds URLs with environment variables or service base URLs, define `urlBases` so the scanner can map usages to provider endpoints even when the literal strings differ. Example:

- In user-service:
  ```ts
  const r = await axios.get(`${process.env.TRANSACTION_SERVICE_URL}/transactions/user/${user.id}/recent`);
  ```
- In config:
  ```json
  { "name": "transactions", "repo": "transactions-service", "baseUrl": "/${TRANSACTION_SERVICE_URL}" }
  ```

The scanner canonicalizes placeholders like `${TRANSACTION_SERVICE_URL}` and path parameters so it can match the usage to the “transactions-service” endpoint signature.

## Advanced configuration

- BLUETEXT_MULTIREPO_CONFIG
  - Set this env var to an absolute or relative path to a config file if you don’t want to use `multirepo.config.json` in the project root.
  - The server resolves relative paths against the current working directory or the config file’s directory as appropriate.

- featureGlobs
  ```json
  {
    "featureGlobs": [
      { "name": "auth", "include": ["**/auth/**"] },
      { "name": "payments", "include": ["**/payments/**"], "exclude": ["**/tests/**"] }
    ]
  }
  ```
  Endpoints found in files matching these globs will carry `feature` metadata.

- includeFileExtensions
  - Defaults include TypeScript, JavaScript, Python, JSON, YAML/YML. Restrict it if you need faster scans.

- excludeGlobs
  - Keep noise low by excluding build dirs, virtual envs, IDE folders, etc.

## Typical workflows

- Explore cross-repo relations
  - Read `bluetext://multirepo/summary` to see the top edges (e.g., “user-service -> transactions-service: GET /transactions/user/:id/recent”)
  - Inspect the Mermaid graph via `bluetext://multirepo/graph.mmd`

- Investigate a single repo
  - Read `bluetext://multirepo/repo/<repoId>/endpoints.json` and `.../usages.json`

- Build tooling on top of raw data
  - Consume `bluetext://multirepo/index.json` to integrate into CI, dashboards, or change-impact analysis

## Troubleshooting

- No repos found
  - Ensure `repos` or `roots` are configured
  - Use absolute paths or verify relative paths resolve from the config file directory

- Endpoints/usages missing
  - Add the relevant file extensions to `includeFileExtensions`
  - Check that source code patterns match supported detectors (Express/Fastify/Flask/FastAPI/NestJS/OpenAPI and fetch/axios/requests/http)

- Edges not created
  - Define `urlBases` to help map outbound calls to provider repos when URLs are composed with env vars or differ by host
  - The scanner canonicalizes path params; ensure HTTP methods align when possible

- Index not updating
  - The index is regenerated on each resource read. Confirm your MCP client is actively calling:
    - `bluetext://multirepo/summary` or `.../index.json` or `.../graph.mmd`
  - Verify `indexPath` is writable and not excluded erroneously

## Notes on portability and version control

- Do not commit `multirepo-index.json` (already ignored).
- Commit `multirepo.config.json` (portable).
- If sharing data externally, consider redacting absolute paths and commit SHAs; by default the index is environment-specific.

## Related documentation resources exposed by the server

- bluetext://intro
- bluetext://polytope-docs
- bluetext://blueprints
- bluetext://polytope/standard-modules/<module-id>
- bluetext://code-gen-modules/<module-id>

You can list all available resources via your MCP client’s “List Resources” capability for the bluetext server.
