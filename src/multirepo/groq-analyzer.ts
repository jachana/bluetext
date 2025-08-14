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
            
            Respond with a JSON object containing "relationships" and "insights" arrays.`
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.3,
        max_tokens: 4000,
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

Return JSON with this structure:
{
  "relationships": [
    {
      "fromRepoId": "repo1",
      "toRepoId": "repo2", 
      "fromEndpoint": "GET /api/users",
      "toEndpoint": "POST /auth/login",
      "relationship": "authentication_flow",
      "confidence": 0.8,
      "reasoning": "repo1 makes auth calls to repo2's login endpoint"
    }
  ],
  "insights": [
    {
      "type": "architecture",
      "message": "Microservices architecture with authentication service",
      "confidence": 0.9
    }
  ]
}`;
  }

  /**
   * Convert Groq analysis results to CrossRepoEdge format
   */
  convertToEdges(analysis: GroqAnalysisResult, index: MultirepoIndex): CrossRepoEdge[] {
    const edges: CrossRepoEdge[] = [];
    
    for (const rel of analysis.relationships) {
      if (rel.confidence >= 0.5) { // Only include high-confidence relationships
        const edgeId = `groq-${rel.fromRepoId}-${rel.toRepoId}-${rel.relationship}`;
        edges.push({
          fromRepoId: rel.fromRepoId,
          toRepoId: rel.toRepoId,
          label: `${rel.fromEndpoint} → ${rel.toEndpoint}`,
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
