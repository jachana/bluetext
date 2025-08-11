// Graph aggregator for building unified repository dependency graph
import { RepoRef } from '../config/types.js';
import { UnifiedGraph, GraphNode, GraphEdge } from './types.js';
import { parseRepoDependencies } from '../parser/packageJson.js';

/**
 * Build unified graph from repository references
 * @param repoRefs Array of repository references with absolute paths
 * @param includeDevDeps Whether to include development dependencies
 * @returns Unified graph with nodes and edges
 */
export function buildGraph(repoRefs: RepoRef[], includeDevDeps: boolean = false): UnifiedGraph {
  // Create nodes for all repositories
  const nodes = createNodes(repoRefs);
  
  // Create edges based on dependencies
  const edges = createEdges(repoRefs, includeDevDeps);
  
  return {
    nodes,
    edges,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Create graph nodes from repository references
 * @param repoRefs Array of repository references
 * @returns Array of graph nodes
 */
function createNodes(repoRefs: RepoRef[]): GraphNode[] {
  return repoRefs.map(repo => ({
    id: repo.name,
    kind: 'repo' as const,
    label: repo.name
  }));
}

/**
 * Create graph edges from repository dependencies
 * @param repoRefs Array of repository references
 * @param includeDevDeps Whether to include development dependencies
 * @returns Array of graph edges
 */
function createEdges(repoRefs: RepoRef[], includeDevDeps: boolean): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const allRepoNames = getRepoNames(repoRefs);
  
  for (const repo of repoRefs) {
    // Parse dependencies for this repository
    const dependencies = parseRepoDependencies(repo.path, allRepoNames, includeDevDeps);
    
    // Create edges for each dependency
    for (const depName of dependencies) {
      edges.push({
        from: repo.name,
        to: depName,
        relation: 'depends_on' as const
      });
    }
  }
  
  return edges;
}

/**
 * Get all repository names from references
 * @param repoRefs Array of repository references
 * @returns Array of repository names
 */
function getRepoNames(repoRefs: RepoRef[]): string[] {
  return repoRefs.map(ref => ref.name);
}
