# Hello World MCP Server

A simple "Hello World" Model Context Protocol (MCP) server built with TypeScript.

## Overview

This is a basic MCP server that demonstrates:
- **Tool functionality** with `say_hello` and `get_greeting`
- **Resource serving** with welcome messages and server info
- **TypeScript implementation** using the MCP SDK
- **Multi-language support** for greetings

## Features

### Tools
- **`say_hello`**: Say hello to someone or something
- **`get_greeting`**: Get personalized greetings in multiple languages (English, Spanish, French, German)

### Resources
- **`hello://welcome`**: A welcome message explaining the server
- **`hello://info`**: JSON information about the server

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Usage

### With Cline
Add to your MCP settings configuration:
```json
{
  "mcpServers": {
    "hello-world": {
      "command": "node",
      "args": ["path/to/hello-world-mcp-server/build/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Direct Testing
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node build/index.js
```

## Project Structure

```
hello-world-mcp-server/
├── package.json          # Project configuration and dependencies
├── tsconfig.json         # TypeScript compiler settings
├── src/
│   └── index.ts          # Main server implementation
└── build/                # Compiled JavaScript output
    ├── index.js          # Compiled server
    ├── index.d.ts        # Type definitions
    └── source maps
```

## Development

- **Build**: `npm run build`
- **Watch mode**: `npm run dev`
- **Start**: `npm start`

## Technical Details

- **Language**: TypeScript with ES modules
- **Framework**: Model Context Protocol (MCP) SDK
- **Transport**: Standard I/O (stdio) for communication
- **Build System**: TypeScript compiler with source maps

## Example Usage

Once configured with Cline, you can:
- Ask: "Say hello to John using my MCP server"
- Request: "Get a greeting in French for Maria"
- Command: "Show me the welcome message from my server"

## License

MIT
