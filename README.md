# bluetext MCP Server

Agentic coding assistant for systems built on Polytope

This is a TypeScript-based MCP server that provides access to Bluetext documentation resources. It serves documentation files from the polytope, code-gen-modules, and blueprints directories as MCP resources.

## Features

### Resources
The server provides access to the following documentation resources:

- **`bluetext://polytope-docs`** - Comprehensive Polytope platform documentation (`polytope/intro.md`)
- **`bluetext://code-gen-modules/<module-id>`** - Code generation module documentation (`code-gen-modules/<module-id>.md`)
  - Available modules: `add-package-npm`, `add-package-python`, `boilerplate`
- **`bluetext://blueprints`** - Introduction to Bluetext blueprints (`blueprints/intro.md`)
- **`bluetext://blueprints/<blueprint-id>`** - Individual blueprint documentation (`blueprints/<blueprint-id>/intro.md`)
  - Available blueprints: `couchbase`, `init`, `python-api`, `redpanda`, `redpanda-console`, `web-app`

All resources are served with `text/markdown` MIME type and include comprehensive documentation about Polytope concepts, modules, and blueprints.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bluetext": {
      "command": "/path/to/bluetext/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
