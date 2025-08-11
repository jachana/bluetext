// Main MCP server for the Multirepo MCP Server
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from '../config/loader.js';
import { buildGraph } from '../aggregator/aggregator.js';
import { generateMermaid } from '../graph/mermaid.js';
import { RepoConfig } from '../config/types.js';
import { UnifiedGraph } from '../aggregator/types.js';

export class MultirepoMcpServer {
  private server: Server;
  private config: RepoConfig | null = null;
  private graph: UnifiedGraph | null = null;

  constructor(configPath: string = 'config.yml') {
    this.server = new Server(
      {
        name: 'multirepo-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Load configuration and build graph
    this.initializeServer(configPath);
    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private initializeServer(configPath: string) {
    try {
      // TODO: Load configuration and build graph
      // this.config = loadConfig(configPath);
      // this.graph = buildGraph(this.config.repos, this.config.options?.includeDevDeps);
      console.error('Server initialization not yet implemented');
    } catch (error) {
      console.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_repos',
          description: 'List all configured repositories',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_dependencies',
          description: 'Get dependency relationships for repositories',
          inputSchema: {
            type: 'object',
            properties: {
              repoName: {
                type: 'string',
                description: 'Optional repository name to filter dependencies',
              },
            },
            required: [],
          },
        },
        {
          name: 'generate_graph',
          description: 'Generate Mermaid diagram and graph JSON',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'list_repos':
          return this.handleListRepos();

        case 'get_dependencies':
          return this.handleGetDependencies(request.params.arguments?.repoName as string | undefined);

        case 'generate_graph':
          return this.handleGenerateGraph();

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
          uri: 'multirepo://config',
          name: 'Configuration',
          mimeType: 'application/json',
          description: 'Current server configuration',
        },
        {
          uri: 'multirepo://graph',
          name: 'Dependency Graph',
          mimeType: 'application/json',
          description: 'Current unified dependency graph',
        },
      ],
    }));

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      switch (request.params.uri) {
        case 'multirepo://config':
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.config || {}, null, 2),
              },
            ],
          };

        case 'multirepo://graph':
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.graph || {}, null, 2),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${request.params.uri}`);
      }
    });
  }

  private handleListRepos() {
    // TODO: Implement list_repos handler
    return {
      content: [
        {
          type: 'text',
          text: 'Repository listing not yet implemented',
        },
      ],
    };
  }

  private handleGetDependencies(repoName?: string) {
    // TODO: Implement get_dependencies handler
    return {
      content: [
        {
          type: 'text',
          text: 'Dependency analysis not yet implemented',
        },
      ],
    };
  }

  private handleGenerateGraph() {
    // TODO: Implement generate_graph handler
    return {
      content: [
        {
          type: 'text',
          text: 'Graph generation not yet implemented',
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Multirepo MCP server running on stdio');
  }
}
