import Groq from 'groq-sdk';
import { Endpoint, Usage, CrossRepoEdge, MultirepoIndex } from '../types.js';

export interface GroqAnalysisResult {
  relationships: Array<{
    fromRepoId: string;
    toRepoId: string;
    fromEndpoint: string;
    toEndpoint: string;
    relationship: string;
    confidence: number;
    reasoning: string;
  }>;
  insights: Array<{
    type: 'pattern' | 'architecture' | 'suggestion';
    message: string;
    confidence: number;
  }>;
  mermaidGraph?: string; // AI-generated complete Mermaid graph
}

export class GroqAnalyzer {
  private groq: Groq;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    this.groq = new Groq({ apiKey: key });
  }

  /**
   * Analyze multirepo index to find intelligent relationships using Groq
   */
  async analyzeRelationships(index: MultirepoIndex): Promise<GroqAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(index);
    
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert software architect analyzing microservices and API relationships. 
            Your task is to identify potential relationships between services based on their API endpoints and usage patterns.
            
            Focus on:
            1. Services that likely communicate with each other based on endpoint patterns
            2. Common API patterns (REST, GraphQL, etc.)
            3. Service dependencies and data flow
            4. Authentication and authorization patterns
            5. Integration patterns
            6. Business domain relationships (e.g., user management, payment processing, etc.)
            
            For relationship names, use descriptive, business-focused terms like:
            - "user_authentication" instead of just "auth"
            - "payment_processing" instead of "payment"
            - "data_retrieval" instead of "get"
            - "order_management" instead of "order"
            - "notification_delivery" instead of "notify"
            
            Respond with a JSON object containing "relationships" and "insights" arrays.`
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.3,
        max_tokens: 8192, // Increased from 4000 for more comprehensive analysis
        response_format: { type: "json_object" }
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from Groq');
      }

      return JSON.parse(result) as GroqAnalysisResult;
    } catch (error) {
      console.error('Groq analysis failed:', error);
      return {
        relationships: [],
        insights: [{
          type: 'suggestion',
          message: `Groq analysis failed: ${error instanceof Error ? error.message : String(error)}. Using basic pattern matching instead.`,
          confidence: 0
        }]
      };
    }
  }

  /**
   * Build analysis prompt from multirepo index
   */
  private buildAnalysisPrompt(index: MultirepoIndex): string {
    const repos = Object.values(index.repos);
    const endpoints = Object.values(index.endpoints);
    const usages = Object.values(index.usages);

    // Group data by repository for better analysis
    const repoData = repos.map(repo => {
      const repoEndpoints = endpoints.filter(e => e.repoId === repo.id);
      const repoUsages = usages.filter(u => u.repoId === repo.id);
      
      return {
        repo: {
          id: repo.id,
          name: repo.name,
          languages: repo.detectedLanguages
        },
        endpoints: repoEndpoints.map(e => ({
          method: e.method,
          path: e.path,
          framework: e.framework,
          file: e.relFile
        })),
        usages: repoUsages.map(u => ({
          method: u.method,
          path: u.endpointPath,
          url: u.url,
          tool: u.tool,
          file: u.relFile
        }))
      };
    });

    return `Analyze these ${repos.length} repositories and their API patterns to identify potential service relationships:

${JSON.stringify(repoData, null, 2)}

Instructions:
1. Look for API endpoints in one service that might be called by usage patterns in another service
2. Identify common REST patterns, authentication flows, and data exchange patterns
3. Consider service naming conventions and endpoint paths to infer relationships
4. Provide confidence scores (0-1) for each relationship
5. Include reasoning for each identified relationship
6. Suggest architectural insights and patterns you observe
7. GENERATE A COMPLETE MERMAID GRAPH showing all services and their relationships with detailed edge labels

For the Mermaid graph:
- Use clear service names as nodes
- Include specific endpoint paths in edge labels like "/users/:id/balance (GET)"
- Show HTTP methods in parentheses
- Group related endpoints when multiple exist between same services
- Include service URLs if available
- Make edge labels descriptive of the actual functionality

Example Mermaid format:
graph LR
  U[user-service]
  P[payment-service]
  
  P -->|"/users/:id/balance (GET), http://user-service:3001"| U
  U -->|"/payments/process (POST)"| P

Return JSON with this structure:
{
  "relationships": [
    {
      "fromRepoId": "repo1",
      "toRepoId": "repo2", 
      "fromEndpoint": "GET /api/users",
      "toEndpoint": "POST /auth/login",
      "relationship": "user_authentication",
      "confidence": 0.8,
      "reasoning": "User service authenticates users via auth service login endpoint"
    }
  ],
  "insights": [
    {
      "type": "architecture",
      "message": "Microservices architecture with dedicated authentication service",
      "confidence": 0.9
    }
  ],
  "mermaidGraph": "graph LR\n  U[user-service]\n  A[auth-service]\n  U -->|\"/auth/login (POST)\"| A"
}

Focus on making the Mermaid graph comprehensive and detailed, showing all discovered service relationships.`;
  }

  /**
   * Generate AI-powered Mermaid graph directly from analysis
   */
  async generateAIMermaidGraph(index: MultirepoIndex): Promise<string> {
    try {
      const analysis = await this.analyzeRelationships(index);
      
      if (analysis.mermaidGraph) {
        return analysis.mermaidGraph;
      }
      
      // Fallback: generate basic graph if AI didn't provide one
      return this.generateFallbackMermaid(index, analysis);
    } catch (error) {
      console.error('AI Mermaid generation failed:', error);
      return this.generateFallbackMermaid(index);
    }
  }

  /**
   * Generate a fallback Mermaid graph when AI generation fails
   */
  private generateFallbackMermaid(index: MultirepoIndex, analysis?: GroqAnalysisResult): string {
    const lines: string[] = [];
    lines.push("graph LR");
    
    // Add nodes
    for (const [repoId, repo] of Object.entries(index.repos)) {
      const nodeId = repoId.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push(`  ${nodeId}[${repo.name || repoId}]`);
    }
    
    // Add edges from analysis or basic edges
    if (analysis?.relationships) {
      for (const rel of analysis.relationships) {
        if (rel.confidence >= 0.5) {
          const fromId = rel.fromRepoId.replace(/[^a-zA-Z0-9_]/g, "_");
          const toId = rel.toRepoId.replace(/[^a-zA-Z0-9_]/g, "_");
          const label = `${rel.fromEndpoint} → ${rel.toEndpoint}`;
          lines.push(`  ${fromId} -->|"${label}"| ${toId}`);
        }
      }
    } else {
      // Use basic edges
      for (const edge of index.edges) {
        const fromId = edge.fromRepoId.replace(/[^a-zA-Z0-9_]/g, "_");
        const toId = edge.toRepoId.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`  ${fromId} -->|"${edge.label}"| ${toId}`);
      }
    }
    
    return lines.join("\n");
  }

  /**
   * Convert Groq analysis results to CrossRepoEdge format
   */
  convertToEdges(analysis: GroqAnalysisResult, index: MultirepoIndex): CrossRepoEdge[] {
    const edges: CrossRepoEdge[] = [];
    
    for (const rel of analysis.relationships) {
      if (rel.confidence >= 0.5) { // Only include high-confidence relationships
        const edgeId = `groq-${rel.fromRepoId}-${rel.toRepoId}-${rel.relationship}`;
        // Clean up endpoint paths to avoid markdown-like syntax
        const cleanFromEndpoint = rel.fromEndpoint
          .replace(/[[\]()]/g, '')  // Remove markdown link syntax
          .replace(/\${[^}]+}/g, 'param')  // Replace template variables
          .replace(/\/+/g, '/')  // Normalize slashes
          .trim();
        
        const cleanToEndpoint = rel.toEndpoint
          .replace(/[[\]()]/g, '')  // Remove markdown link syntax
          .replace(/\${[^}]+}/g, 'param')  // Replace template variables
          .replace(/\/+/g, '/')  // Normalize slashes
          .trim();

        const label = `${cleanFromEndpoint} → ${cleanToEndpoint}`;
        
        edges.push({
          fromRepoId: rel.fromRepoId,
          toRepoId: rel.toRepoId,
          label: label,
          count: Math.round(rel.confidence * 10), // Convert confidence to count
          endpointIds: [], // We don't have specific endpoint IDs from Groq
          usageIds: [],
          groqAnalysis: {
            relationship: rel.relationship,
            confidence: rel.confidence,
            reasoning: rel.reasoning
          }
        });
      }
    }
    
    return edges;
  }
}

/**
 * Test the Groq analyzer with a sample multirepo index
 */
export async function testGroqAnalyzer(indexPath: string = 'multirepo-index.json'): Promise<void> {
  try {
    const fs = await import('fs');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as MultirepoIndex;
    
    console.log('🧠 Testing Groq Analyzer...');
    console.log(`📊 Input: ${Object.keys(indexData.repos).length} repos, ${Object.keys(indexData.endpoints).length} endpoints, ${Object.keys(indexData.usages).length} usages`);
    
    const analyzer = new GroqAnalyzer();
    const analysis = await analyzer.analyzeRelationships(indexData);
    
    console.log('\n🔍 Groq Analysis Results:');
    console.log('Relationships found:', analysis.relationships.length);
    
    analysis.relationships.forEach((rel, i) => {
      console.log(`\n${i + 1}. ${rel.fromRepoId} → ${rel.toRepoId}`);
      console.log(`   Relationship: ${rel.relationship}`);
      console.log(`   Confidence: ${rel.confidence}`);
      console.log(`   Flow: ${rel.fromEndpoint} → ${rel.toEndpoint}`);
      console.log(`   Reasoning: ${rel.reasoning}`);
    });
    
    console.log('\n💡 Insights:');
    analysis.insights.forEach((insight, i) => {
      console.log(`${i + 1}. [${insight.type}] ${insight.message} (confidence: ${insight.confidence})`);
    });
    
    const edges = analyzer.convertToEdges(analysis, indexData);
    console.log(`\n✅ Generated ${edges.length} cross-repository edges`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}
