# Multirepo MCP Server

A Model Context Protocol (MCP) server for unified context across distributed codebases. This server helps enterprise teams understand and navigate multiple repositories by aggregating cross-repo context, relationships, and dependencies into the Cline ecosystem.

## Features

- **Repository Discovery**: List and manage multiple repositories from a single configuration
- **Dependency Analysis**: Parse package.json files to understand inter-repository dependencies
- **Visual Graphs**: Generate Mermaid diagrams showing repository relationships
- **MCP Integration**: Seamlessly integrates with Cline/VS Code through the MCP protocol

## Quick Start

### Prerequisites

- Node.js v20+
- TypeScript
- Cline or VS Code with MCP support

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Create your configuration file:
   ```bash
   cp config.example.yml config.yml
   ```

5. Edit `config.yml` to point to your repositories:
   ```yaml
   repos:
     - name: my-service-a
       path: ../my-service-a
     - name: my-service-b
       path: ../my-service-b
   options:
     includeDevDeps: false
   ```

### Usage

Run the server:
```bash
npm start
```

Or in development mode:
```bash
npm run dev
```

## MCP Tools

The server provides the following MCP tools:

### `list_repos`
Lists all configured repositories.

**Input**: None
**Output**: Array of repository references

### `get_dependencies`
Returns dependency relationships for repositories.

**Input**: 
- `repoName` (optional): Filter dependencies for a specific repository

**Output**: Adjacency list and graph data

### `generate_graph`
Generates a Mermaid diagram and graph JSON.

**Input**: None
**Output**: 
- `mermaid`: Mermaid flowchart syntax
- `graph`: Unified graph JSON

## Configuration

The server uses a YAML configuration file (`config.yml`) with the following structure:

```yaml
repos:
  - name: service-name          # Unique identifier
    path: /path/to/repository   # Absolute or relative path
options:
  includeDevDeps: false         # Include devDependencies in analysis
```

## Architecture

```
src/
├── config/          # Configuration loading and validation
├── parser/          # Repository parsing (package.json)
├── aggregator/      # Graph building and aggregation
├── graph/           # Mermaid diagram generation
├── mcp/             # MCP server implementation
└── git/             # Git operations (future)
```

## Development Status

This is a hackathon project with MVP functionality:

- ✅ Project structure and TypeScript setup
- ✅ MCP server framework with tools and resources
- ✅ Configuration system design
- 🚧 Configuration loader implementation
- 🚧 Package.json parser
- 🚧 Graph aggregator
- 🚧 Mermaid generator
- ⏳ Advanced parsing (AST analysis)
- ⏳ Remote repository support
- ⏳ Impact analysis

## Contributing

This is a hackathon project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
