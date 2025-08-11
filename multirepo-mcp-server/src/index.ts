#!/usr/bin/env node
// Main entry point for the Multirepo MCP Server
import { MultirepoMcpServer } from './mcp/server.js';

const server = new MultirepoMcpServer();
server.run().catch(console.error);
