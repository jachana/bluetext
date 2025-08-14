#!/usr/bin/env node

// Show the exact data that would be sent to Groq for analysis
import { readFileSync } from 'fs';

console.log('📊 Multirepo Index Analysis Data for Groq\n');

try {
  const indexData = JSON.parse(readFileSync('multirepo-index.json', 'utf-8'));
  
  console.log('📈 Summary:');
  console.log(`- Repositories: ${Object.keys(indexData.repos).length}`);
  console.log(`- Endpoints: ${Object.keys(indexData.endpoints).length}`);
  console.log(`- Usages: ${Object.keys(indexData.usages).length}`);
  console.log(`- Current Edges: ${indexData.edges.length}`);
  
  // Build the same data structure that would be sent to Groq
  const repos = Object.values(indexData.repos);
  const endpoints = Object.values(indexData.endpoints);
  const usages = Object.values(indexData.usages);

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
  
  console.log('\n🎯 Data Structure for Groq Analysis:');
  console.log(JSON.stringify(repoData, null, 2));
  
  console.log('\n📝 Sample Groq Prompt:');
  console.log(`
Analyze these ${repos.length} repositories and their API patterns to identify potential service relationships:

${JSON.stringify(repoData, null, 2)}

Instructions:
1. Look for API endpoints in one service that might be called by usage patterns in another service
2. Identify common REST patterns, authentication flows, and data exchange patterns
3. Consider service naming conventions and endpoint paths to infer relationships
4. Provide confidence scores (0-1) for each relationship
5. Include reasoning for each identified relationship
6. Suggest architectural insights and patterns you observe

Return JSON with relationships and insights arrays.
  `);
  
} catch (error) {
  console.error('❌ Error loading multirepo index:', error);
}
