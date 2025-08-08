#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class HelloWorldServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'hello-world-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'say_hello',
          description: 'Say hello to someone or something',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The name to greet (optional)',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_greeting',
          description: 'Get a personalized greeting message',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Your name',
              },
              language: {
                type: 'string',
                description: 'Language for greeting (en, es, fr, de)',
                enum: ['en', 'es', 'fr', 'de'],
              },
            },
            required: ['name'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'say_hello': {
          const name = request.params.arguments?.name || 'World';
          return {
            content: [
              {
                type: 'text',
                text: `Hello, ${name}! 👋 Welcome to your first MCP server!`,
              },
            ],
          };
        }

        case 'get_greeting': {
          const name = request.params.arguments?.name;
          const language = request.params.arguments?.language || 'en';
          
          if (!name) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Name is required for personalized greeting',
                },
              ],
              isError: true,
            };
          }

          const greetings = {
            en: `Hello ${name}! Nice to meet you!`,
            es: `¡Hola ${name}! ¡Mucho gusto!`,
            fr: `Bonjour ${name}! Enchanté!`,
            de: `Hallo ${name}! Freut mich!`,
          };

          return {
            content: [
              {
                type: 'text',
                text: greetings[language as keyof typeof greetings] || greetings.en,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'hello://welcome',
          name: 'Welcome Message',
          mimeType: 'text/plain',
          description: 'A welcome message for new users',
        },
        {
          uri: 'hello://info',
          name: 'Server Information',
          mimeType: 'application/json',
          description: 'Information about this Hello World MCP server',
        },
      ],
    }));

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      switch (request.params.uri) {
        case 'hello://welcome':
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'text/plain',
                text: `Welcome to your first MCP server! 🎉

This is a simple "Hello World" MCP server that demonstrates:
- Basic tool functionality with say_hello and get_greeting
- Resource serving with welcome messages and server info
- TypeScript implementation using the MCP SDK

You can use the tools to:
1. Say hello to anyone with say_hello
2. Get personalized greetings in different languages with get_greeting

Enjoy exploring MCP servers!`,
              },
            ],
          };

        case 'hello://info':
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  {
                    name: 'Hello World MCP Server',
                    version: '0.1.0',
                    description: 'A simple MCP server for learning purposes',
                    tools: ['say_hello', 'get_greeting'],
                    resources: ['hello://welcome', 'hello://info'],
                    created: new Date().toISOString(),
                    author: 'MCP Learner',
                  },
                  null,
                  2
                ),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${request.params.uri}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Hello World MCP server running on stdio');
  }
}

const server = new HelloWorldServer();
server.run().catch(console.error);
