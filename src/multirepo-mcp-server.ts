#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, rmSync } from 'fs';
import { resolve, join, basename } from 'path';
import { homedir } from 'os';
import crypto from 'crypto';
import Groq from 'groq-sdk';
import { scanMultirepo } from './multirepo/scanner.js';
import { generateMermaid, generateAIMermaid } from './multirepo/mermaid.js';
import { MultirepoConfig, MultirepoIndex } from './types.js';

class MultirepoMcpServer {
  private server: Server;
  private groqClient: Groq | null = null;
 
  constructor() {
    this.server = new Server(
      {
        name: 'bluetext-multirepo',
        version: '1.0.0',
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
    
    // Initialize Groq client for LLM analysis
    this.initializeGroqClient();
    
    // Migrate any existing local scans on startup
    this.migrateLocalScans();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Initialize Groq client with API key from MCP settings
   */
  private initializeGroqClient() {
    try {
      // Debug: Log all environment variables related to Groq
      console.log('[Groq] Environment check:');
      console.log('[Groq] GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'PRESENT' : 'MISSING');
      console.log('[Groq] api_key_groq:', process.env.api_key_groq ? 'PRESENT' : 'MISSING');
      console.log('[Groq] All env keys:', Object.keys(process.env).filter(k => k.toLowerCase().includes('groq')));
      
      // Get API key from environment variable that should be set by MCP
      const apiKey = process.env.GROQ_API_KEY || process.env.api_key_groq;
      if (!apiKey) {
        console.log('[Groq] API key not found in environment, LLM analysis disabled');
        return;
      }
      
      this.groqClient = new Groq({ apiKey });
      console.log('[Groq] LLM analysis enabled with API key:', apiKey.substring(0, 10) + '...');
    } catch (error) {
      console.error('[Groq] Failed to initialize:', error);
    }
  }

  /**
   * Analyze scan data with Groq LLM to generate enhanced dependency graph
   */
  private async analyzeWithLLM(scanData: MultirepoIndex): Promise<string | null> {
    if (!this.groqClient) {
      return null;
    }

    try {
      // Create a condensed version of scan data to reduce token usage
      const condensedData = {
        repos: Object.fromEntries(
          Object.entries(scanData.repos).map(([id, repo]) => [
            id, 
            { id: repo.id, name: repo.name, languages: repo.detectedLanguages }
          ])
        ),
        endpoints: Object.values(scanData.endpoints).map(e => ({
          repoId: e.repoId,
          method: e.method,
          path: e.path,
          framework: e.framework
        })),
        usages: Object.values(scanData.usages).map(u => ({
          repoId: u.repoId,
          method: u.method,
          endpointPath: u.endpointPath,
          url: u.url,
          tool: u.tool
        })),
        existingEdges: scanData.edges.map(e => ({
          from: e.fromRepoId,
          to: e.toRepoId,
          label: e.label
        }))
      };

      const prompt = `You are an expert software architect analyzing microservice dependencies.

I have scan data from ${Object.keys(scanData.repos).length} repositories. Please analyze this data and generate a clean Mermaid dependency graph.

**Key patterns to look for:**
1. Environment variables like \$\{PAYMENT_SERVICE_URL\}, \$\{TRANSACTION_SERVICE_URL\}, \$\{USER_SERVICE_URL\}
2. HTTP calls between services using axios.get(), axios.post(), etc.
3. Direct URL references to localhost:3001, localhost:3002, localhost:3003
4. Service-to-service container URLs like http://user-service:3001, http://payment-service:3002

**Repository mapping:**
- demo-user-service: Runs on port 3001
- demo-payment-service: Runs on port 3002  
- demo-transaction-service: Runs on port 3003
- swish-demo: Frontend that calls the services
- swish-orchestrator: Health checking and orchestration

**Condensed Scan Data:**
\`\`\`json
${JSON.stringify(condensedData, null, 2)}
\`\`\`

**Please provide ONLY a clean Mermaid graph showing the actual API call relationships between services:**

Focus on actual API calls between services, not just configuration references. Use this format:
\`\`\`mermaid
graph LR
    A[service1] -->|"endpoint"| B[service2]
\`\`\``;

      const chatCompletion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "openai/gpt-oss-120b",
        max_tokens: 4000,
        temperature: 0.1
      });

      const response = chatCompletion.choices[0]?.message?.content || "";
      
      // Extract just the mermaid graph from the response
      const mermaidMatch = response.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch) {
        return mermaidMatch[1].trim();
      }
      
      // If no mermaid block found, look for graph starting with "graph"
      const lines = response.split('\n');
      const graphStart = lines.findIndex(line => line.trim().startsWith('graph '));
      if (graphStart !== -1) {
        const graphLines = [];
        for (let i = graphStart; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && !line.startsWith('```')) {
            graphLines.push(line);
          } else if (line.startsWith('```')) {
            break;
          }
        }
        return graphLines.join('\n');
      }

      return null;
    } catch (error) {
      console.error('[Groq] LLM analysis failed:', error);
      return null;
    }
  }

  /**
   * Migrate any existing local scans to the centralized workspace directory
   */
  private migrateLocalScans() {
    try {
      const localIndexPath = 'multirepo-index.json';
      if (existsSync(localIndexPath)) {
        const index = JSON.parse(readFileSync(localIndexPath, 'utf-8'));
        
        // Generate workspace name from the scan (deterministic based on working directory)
        const workspaceName = this.generateWorkspaceId(process.cwd());
        
        // Save to centralized location
        const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
          join(homedir(), '.bluetext', 'workspaces');
        if (!existsSync(centralWorkspaceDir)) {
          mkdirSync(centralWorkspaceDir, { recursive: true });
        }
        
        const centralIndexPath = join(centralWorkspaceDir, `${workspaceName}-index.json`);
        writeFileSync(centralIndexPath, JSON.stringify(index, null, 2));
        
        console.log(`✅ Migrated local scan to centralized workspace: ${workspaceName}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to migrate local scans:', error);
    }
  }

  private generateWorkspaceId(workingDir: string): string {
    // Create a deterministic workspace ID based on the working directory
    // This ensures the same workspace always gets the same ID
    const normalizedPath = workingDir.replace(/\\/g, '/').toLowerCase();
    const hash = crypto.createHash('md5').update(normalizedPath).digest('hex').substring(0, 8);
    const dirName = basename(normalizedPath) || 'workspace';
    return `${dirName}-${hash}`;
  }

  private loadConfig(): MultirepoConfig {
    const configPath = resolve(process.cwd(), 'multirepo.config.json');
    if (!existsSync(configPath)) {
      // Return default config for current workspace
      return {
        repos: [],
        excludeGlobs: [
          "**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**",
          "**/.venv/**", "**/.idea/**", "**/.vscode/**"
        ],
        includeFileExtensions: [
          ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
          ".py", ".pyx", ".pyi", ".go", ".mod", ".java", ".kt",
          ".json", ".yaml", ".yml", ".toml", ".xml"
        ],
        indexPath: 'multirepo-index.json'
      };
    }
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  private loadIndex(): MultirepoIndex | null {
    const config = this.loadConfig();
    const indexPath = resolve(process.cwd(), config.indexPath || 'multirepo-index.json');
    if (!existsSync(indexPath)) {
      return null;
    }
    return JSON.parse(readFileSync(indexPath, 'utf-8'));
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure_repos',
          description: 'Configure the repositories to scan (paths or URLs)',
          inputSchema: {
            type: 'object',
            properties: {
              repos: {
                type: 'array',
                description: 'List of repositories to scan',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Repository name' },
                    path: { type: 'string', description: 'Local path to repository' },
                    url: { type: 'string', description: 'Remote URL' }
                  },
                  required: ['name'],
                  oneOf: [
                    { required: ['path'] },
                    { required: ['url'] }
                  ]
                }
              }
            },
            required: ['repos']
          }
        },
        {
          name: 'auto_discover_repos',
          description: 'Automatically discover project repositories from workspace roots',
          inputSchema: {
            type: 'object',
            properties: {
              workspaceRoots: {
                type: 'array',
                description: 'Root directories to search for projects',
                items: { type: 'string' }
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum directory depth to search (default: 3)',
                minimum: 1,
                maximum: 10
              },
              minConfidence: {
                type: 'number', 
                description: 'Minimum project confidence score 0-100 (default: 25)',
                minimum: 0,
                maximum: 100
              }
            }
          }
        },
        {
          name: 'scan_multirepo',
          description: 'Scan the configured repositories and generate analysis',
          inputSchema: {
            type: 'object',
            properties: {
              force: {
                type: 'boolean',
                description: 'Force rescan even if index exists',
                default: false
              }
            }
          }
        },
        {
          name: 'remove_workspace',
          description: 'Remove a workspace and all its related resources from the dashboard',
          inputSchema: {
            type: 'object',
            properties: {
              workspaceId: {
                type: 'string',
                description: 'The workspace ID to remove (e.g., "hackathon-mcp-a1b2c3d4")'
              },
              confirmDelete: {
                type: 'boolean',
                description: 'Confirmation flag to prevent accidental deletion',
                default: false
              }
            },
            required: ['workspaceId', 'confirmDelete']
          }
        },
        {
          name: 'list_workspaces',
          description: 'List all available workspaces in the dashboard',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'configure_repos': {
            const args = request.params.arguments as any;
            if (!args?.repos) {
              return {
                content: [{
                  type: 'text',
                  text: 'Error: repos parameter is required'
                }],
                isError: true
              };
            }

            // Update the config file, preserving existing settings
            const config = existsSync('./multirepo.config.json') ? 
              this.loadConfig() : 
              { 
                repos: [], 
                excludeGlobs: [
                  "**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**",
                  "**/.venv/**", "**/.idea/**", "**/.vscode/**"
                ],
                includeFileExtensions: [
                  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
                  ".py", ".pyx", ".pyi", ".go", ".mod", ".java", ".kt",
                  ".json", ".yaml", ".yml", ".toml", ".xml"
                ],
                urlBases: [
                  { baseUrl: "http://localhost:3001", repo: "demo-user-service" },
                  { baseUrl: "http://localhost:3002", repo: "demo-payment-service" },
                  { baseUrl: "http://localhost:3003", repo: "demo-transaction-service" },
                  { baseUrl: "http://user-service:3001", repo: "demo-user-service" },
                  { baseUrl: "http://payment-service:3002", repo: "demo-payment-service" },
                  { baseUrl: "http://transaction-service:3003", repo: "demo-transaction-service" }
                ],
                autoDiscovery: { enabled: true, workspaceRoots: ["."], maxDepth: 2, minConfidence: 25 },
                indexPath: 'multirepo-index.json' 
              };
            
            config.repos = args.repos;
            writeFileSync('./multirepo.config.json', JSON.stringify(config, null, 2));

            return {
              content: [{
                type: 'text',
                text: `✅ Repository configuration updated successfully!

**Configured ${args.repos.length} repositories:**
${args.repos.map((r: any) => `- **${r.name}**: ${r.path || r.url}`).join('\n')}

Configuration saved to multirepo.config.json
Run scan_multirepo to analyze these repositories.`
              }]
            };
          }

          case 'auto_discover_repos': {
            try {
              const args = request.params.arguments as any;
              const { 
                workspaceRoots = [process.cwd()], 
                maxDepth = 3, 
                minConfidence = 25 
              } = args || {};

              // Dynamic import of project detection
              const { autoDiscoverProjects, getRepoName } = await import('./multirepo/project-detection.js');

              let allProjects = [];
              for (const root of workspaceRoots) {
                const projects = autoDiscoverProjects(root, {
                  maxDepth,
                  minConfidence,
                  excludePatterns: []
                });
                allProjects.push(...projects);
              }

              // Filter to only git repos
              const gitProjects = allProjects.filter(project => {
                const gitPath = resolve(project.path, '.git');
                return existsSync(gitPath);
              });

              const discoveredRepos = gitProjects.map(project => ({
                name: getRepoName(project),
                path: project.path,
                types: project.types,
                confidence: project.confidence
              }));

              return {
                content: [{
                  type: 'text',
                  text: `🔍 Auto-discovery completed successfully!

**Discovery Summary:**
- Projects discovered: ${allProjects.length}
- Git repositories found: ${gitProjects.length}
- Search depth: ${maxDepth}
- Min confidence: ${minConfidence}%

**Discovered Repositories:**
${discoveredRepos.map(repo => 
  `- **${repo.name}** (${repo.confidence}% confidence)
    - Path: \`${repo.path}\`
    - Types: ${repo.types.join(', ')}`
).join('\n\n')}

${discoveredRepos.length > 0 ? 
  'Use configure_repos to save this configuration, then scan_multirepo to analyze.' :
  'No git repositories found. Try adjusting search parameters.'
}`
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Error during auto-discovery: ${error.message}`
                }],
                isError: true
              };
            }
          }

          case 'scan_multirepo': {
            const args = request.params.arguments as any;
            const force = args?.force || false;
            const config = this.loadConfig();
            
            // Check if we need to scan
            const indexPath = resolve(config.indexPath || './multirepo-index.json');
            if (!force && existsSync(indexPath)) {
              return {
                content: [{
                  type: 'text',
                  text: 'Index already exists. Use force=true to rescan, or use resources to view existing data.'
                }]
              };
            }

            const { index, summary } = await scanMultirepo(config);
            
            // Generate LLM-enhanced Mermaid graph if Groq is available
            let llmMermaid: string | null = null;
            if (this.groqClient) {
              console.log('[Groq] Analyzing scan data with LLM...');
              llmMermaid = await this.analyzeWithLLM(index);
              if (llmMermaid) {
                console.log('[Groq] LLM analysis complete');
              }
            }
            
            // Save the index locally
            writeFileSync(indexPath, JSON.stringify(index, null, 2));
            
            // Also save to centralized workspace indexes for the dashboard
            const workspaceName = this.generateWorkspaceId(process.cwd());
            const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
              join(homedir(), '.bluetext', 'workspaces');
            if (!existsSync(centralWorkspaceDir)) {
              mkdirSync(centralWorkspaceDir, { recursive: true });
            }
            const centralIndexPath = join(centralWorkspaceDir, `${workspaceName}-index.json`);
            writeFileSync(centralIndexPath, JSON.stringify(index, null, 2));
            
            // Generate mermaid diagrams (both original and LLM-enhanced)
            const originalMermaid = await generateAIMermaid(index);
            const mermaid = llmMermaid || originalMermaid;
            
            // Save the LLM-enhanced mermaid graph to a separate file
            if (llmMermaid) {
              const mermaidPath = join(centralWorkspaceDir, `${workspaceName}-mermaid.mmd`);
              writeFileSync(mermaidPath, llmMermaid);
            }

            return {
              content: [{
                type: 'text',
                text: `✅ Multirepo scan completed successfully!

📊 **Scan Summary:**
- Repositories scanned: ${summary.reposScanned}
- Files scanned: ${summary.filesScanned}  
- API endpoints found: ${summary.endpointsFound}
- API usages found: ${summary.usagesFound}
- Duration: ${summary.durationMs}ms

💾 **Data Saved:**
- Local: ${indexPath}
- Dashboard: ${centralIndexPath}
- Workspace: **${workspaceName}**

**Cross-Repository Relationships:** ${index.edges.length}

🔗 **Mermaid Graph${llmMermaid ? ' (LLM-Enhanced)' : ''}:**
\`\`\`mermaid
${mermaid}
\`\`\`

${llmMermaid ? '🤖 **LLM Analysis:** Enhanced dependency graph generated using Groq AI' : '📊 **Standard Analysis:** Basic pattern matching used'}

🎯 **Next Steps:**
- View dashboard: Visit the Bluetext dashboard to see this workspace
- Use resources: Access multirepo:// resources for detailed analysis
- Share results: Workspace data is centrally available for team access

🔍 **Use resources to explore the data:**
- multirepo://config - View configuration
- multirepo//summary - Human-readable summary
- multirepo://index.json - Raw scan data
- multirepo://graph.mmd - Mermaid diagram`
              }]
            };
          }

          case 'list_workspaces': {
            try {
              const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
                join(homedir(), '.bluetext', 'workspaces');
              
              if (!existsSync(centralWorkspaceDir)) {
                return {
                  content: [{
                    type: 'text',
                    text: 'No workspaces found. The workspace directory does not exist yet.'
                  }]
                };
              }

              const files = readdirSync(centralWorkspaceDir);
              const workspaceFiles = files.filter(f => f.endsWith('-index.json'));
              
              if (workspaceFiles.length === 0) {
                return {
                  content: [{
                    type: 'text',
                    text: 'No workspaces found in the dashboard.'
                  }]
                };
              }

              const workspaces = workspaceFiles.map(filename => {
                const workspaceId = filename.replace('-index.json', '');
                const filePath = join(centralWorkspaceDir, filename);
                
                try {
                  const index = JSON.parse(readFileSync(filePath, 'utf-8'));
                  const repoCount = Object.keys(index.repos || {}).length;
                  const endpointCount = Object.keys(index.endpoints || {}).length;
                  const usageCount = Object.keys(index.usages || {}).length;
                  const edgeCount = (index.edges || []).length;
                  
                  return `🏢 **${workspaceId}**
  📁 ${repoCount} repositories
  🔌 ${endpointCount} endpoints, 📞 ${usageCount} usages
  🔗 ${edgeCount} cross-repo relationships
  📅 Last updated: ${new Date(index.updatedAt || index.createdAt).toLocaleString()}`;
                } catch {
                  return `🏢 **${workspaceId}** (corrupted - safe to remove)`;
                }
              });

              return {
                content: [{
                  type: 'text',
                  text: `📊 **Available Workspaces**\n\n${workspaces.join('\n\n')}\n\nUse \`remove_workspace\` tool to clean up unwanted workspaces.`
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Error listing workspaces: ${error.message}`
                }],
                isError: true
              };
            }
          }

          case 'remove_workspace': {
            try {
              const args = request.params.arguments as any;
              const { workspaceId, confirmDelete = false } = args || {};
              
              if (!workspaceId) {
                return {
                  content: [{
                    type: 'text',
                    text: 'Error: workspaceId is required'
                  }],
                  isError: true
                };
              }

              if (!confirmDelete) {
                return {
                  content: [{
                    type: 'text',
                    text: 'Error: confirmDelete must be set to true to prevent accidental deletion'
                  }],
                  isError: true
                };
              }

              const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
                join(homedir(), '.bluetext', 'workspaces');
              
              if (!existsSync(centralWorkspaceDir)) {
                return {
                  content: [{
                    type: 'text',
                    text: 'No workspace directory found. Nothing to remove.'
                  }]
                };
              }

              // Find and remove workspace files
              const indexFile = join(centralWorkspaceDir, `${workspaceId}-index.json`);
              const mermaidFile = join(centralWorkspaceDir, `${workspaceId}-mermaid.mmd`);
              
              let removedFiles = [];
              let notFoundFiles = [];

              // Remove index file
              if (existsSync(indexFile)) {
                unlinkSync(indexFile);
                removedFiles.push(`${workspaceId}-index.json`);
              } else {
                notFoundFiles.push(`${workspaceId}-index.json`);
              }

              // Remove mermaid file
              if (existsSync(mermaidFile)) {
                unlinkSync(mermaidFile);
                removedFiles.push(`${workspaceId}-mermaid.mmd`);
              } else {
                notFoundFiles.push(`${workspaceId}-mermaid.mmd`);
              }

              // Check for any other related files (like backups, logs, etc.)
              const allFiles = readdirSync(centralWorkspaceDir);
              const relatedFiles = allFiles.filter(file => file.startsWith(workspaceId + '-'));
              
              for (const file of relatedFiles) {
                if (!removedFiles.includes(file)) {
                  const filePath = join(centralWorkspaceDir, file);
                  unlinkSync(filePath);
                  removedFiles.push(file);
                }
              }

              let message = `✅ **Workspace "${workspaceId}" removed successfully**\n\n`;
              
              if (removedFiles.length > 0) {
                message += `🗑️ **Removed files:**\n${removedFiles.map(f => `  • ${f}`).join('\n')}\n\n`;
              }
              
              if (notFoundFiles.length > 0) {
                message += `⚠️ **Files not found (already removed):**\n${notFoundFiles.map(f => `  • ${f}`).join('\n')}\n\n`;
              }

              if (removedFiles.length === 0) {
                message = `⚠️ **Workspace "${workspaceId}" not found or already removed**\n\nNo files were deleted. Use \`list_workspaces\` to see available workspaces.`;
              }

              return {
                content: [{
                  type: 'text',
                  text: message
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Error removing workspace: ${error.message}`
                }],
                isError: true
              };
            }
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'multirepo://config',
          name: 'Multirepo Config',
          mimeType: 'application/json',
          description: 'Current multirepo configuration'
        },
        {
          uri: 'multirepo://summary',
          name: 'Multirepo Summary', 
          mimeType: 'text/markdown',
          description: 'Human-readable summary of the latest multirepo scan with a mermaid graph'
        },
        {
          uri: 'multirepo://index.json',
          name: 'Multirepo Index',
          mimeType: 'application/json',
          description: 'Raw multirepo index JSON (repos, endpoints, usages, edges)'
        },
        {
          uri: 'multirepo://graph.mmd',
          name: 'Multirepo Graph (Mermaid)',
          mimeType: 'text/plain',
          description: 'Cross-repo relation graph in Mermaid format'
        }
      ]
    }));

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        switch (request.params.uri) {
          case 'multirepo://config': {
            const config = this.loadConfig();
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(config, null, 2)
              }]
            };
          }

          case 'multirepo://summary': {
            const index = this.loadIndex();
            if (!index) {
              throw new Error('No scan data available. Run scan_multirepo first.');
            }
            
            const stats = index.scanStats;
            
            // Try to load LLM-enhanced mermaid graph first  
            const workspaceName = this.generateWorkspaceId(process.cwd());
            const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
              join(homedir(), '.bluetext', 'workspaces');
            const mermaidPath = join(centralWorkspaceDir, `${workspaceName}-mermaid.mmd`);
            
            let mermaid: string;
            let isLLMEnhanced = false;
            if (existsSync(mermaidPath)) {
              mermaid = readFileSync(mermaidPath, 'utf-8');
              isLLMEnhanced = true;
            } else {
              mermaid = await generateAIMermaid(index);
            }
            
            const summary = `# Multirepo Scan Summary

**Scan Statistics:**
- Created: ${index.createdAt}
- Last Updated: ${index.updatedAt}
- Repositories: ${stats?.reposScanned || 0}
- Files Scanned: ${stats?.filesScanned || 0}
- Endpoints Found: ${stats?.endpointsFound || 0}
- Usages Found: ${stats?.usagesFound || 0}
- Duration: ${stats?.durationMs || 0}ms

**Cross-Repository Relationships:** ${index.edges.length}

## Repository Details
${Object.values(index.repos).map(repo => 
  `- **${repo.name}** (${repo.id}): ${(repo.detectedLanguages || []).join(', ')}`
).join('\n')}

## Cross-Repository Graph${isLLMEnhanced ? ' (LLM-Enhanced)' : ''}
${isLLMEnhanced ? '> Generated using Groq AI analysis for enhanced accuracy\n' : ''}
\`\`\`mermaid
${mermaid}
\`\`\``;

            return {
              contents: [{
                uri: request.params.uri,
                mimeType: 'text/markdown',
                text: summary
              }]
            };
          }

          case 'multirepo://index.json': {
            const index = this.loadIndex();
            if (!index) {
              throw new Error('No scan data available. Run scan_multirepo first.');
            }
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(index, null, 2)
              }]
            };
          }

          case 'multirepo://graph.mmd': {
            const index = this.loadIndex();
            if (!index) {
              throw new Error('No scan data available. Run scan_multirepo first.');
            }
            
            // Try to load LLM-enhanced mermaid graph first
            const workspaceName = this.generateWorkspaceId(process.cwd());
            const centralWorkspaceDir = process.env.BLUETEXT_WORKSPACE_DIR || 
              join(homedir(), '.bluetext', 'workspaces');
            const mermaidPath = join(centralWorkspaceDir, `${workspaceName}-mermaid.mmd`);
            
            let mermaid: string;
            if (existsSync(mermaidPath)) {
              mermaid = readFileSync(mermaidPath, 'utf-8');
            } else {
              mermaid = await generateAIMermaid(index);
            }
            
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: 'text/plain',
                text: mermaid
              }]
            };
          }

          default:
            throw new Error(`Unknown resource: ${request.params.uri}`);
        }
      } catch (error: any) {
        throw new Error(`Resource error: ${error.message}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Bluetext Multirepo MCP server running on stdio');
  }
}

const server = new MultirepoMcpServer();
server.run().catch(console.error);
