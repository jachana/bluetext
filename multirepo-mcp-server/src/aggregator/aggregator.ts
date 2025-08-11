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
  // TODO: Implement graph building logic
  throw new Error('Graph aggregator not yet implemented');
}

/**
 * Create graph nodes from repository references
 * @param repoRefs Array of repository references
 * @returns Array of graph nodes
 */
function createNodes(repoRefs: RepoRef[]): GraphNode[] {
  // TODO: Implement node creation
  throw new Error('Node creation not yet implemented');
}

/**
 * Create graph edges from repository dependencies
 * @param repoRefs Array of repository references
 * @param includeDevDeps Whether to include development dependencies
 * @returns Array of graph edges
 */
function createEdges(repoRefs: RepoRef[], includeDevDeps: boolean): GraphEdge[] {
  // TODO: Implement edge creation
  throw new Error('Edge creation not yet implemented');
}

/**
 * Get all repository names from references
 * @param repoRefs Array of repository references
 * @returns Array of repository names
 */
function getRepoNames(repoRefs: RepoRef[]): string[] {
  return repoRefs.map(ref => ref.name);
}
