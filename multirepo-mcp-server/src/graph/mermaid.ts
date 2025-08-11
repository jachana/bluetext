// Mermaid graph generator for visualizing repository dependencies
import { UnifiedGraph, GraphNode, GraphEdge } from '../aggregator/types.js';

/**
 * Generate Mermaid flowchart syntax from unified graph
 * @param graph Unified graph with nodes and edges
 * @returns Mermaid flowchart string
 */
export function generateMermaid(graph: UnifiedGraph): string {
  const lines: string[] = [];
  
  // Start with flowchart declaration
  lines.push('flowchart TD');
  
  // Add node definitions
  const nodeDefinitions = generateNodeDefinitions(graph.nodes);
  lines.push(...nodeDefinitions.map(def => `    ${def}`));
  
  // Add edge definitions
  const edgeDefinitions = generateEdgeDefinitions(graph.edges);
  lines.push(...edgeDefinitions.map(def => `    ${def}`));
  
  return lines.join('\n');
}

/**
 * Generate Mermaid node definitions
 * @param nodes Array of graph nodes
 * @returns Array of Mermaid node definition strings
 */
function generateNodeDefinitions(nodes: GraphNode[]): string[] {
  return nodes.map(node => {
    const sanitizedId = sanitizeNodeId(node.id);
    return `${sanitizedId}[${node.label}]`;
  });
}

/**
 * Generate Mermaid edge definitions
 * @param edges Array of graph edges
 * @returns Array of Mermaid edge definition strings
 */
function generateEdgeDefinitions(edges: GraphEdge[]): string[] {
  return edges.map(edge => {
    const fromId = sanitizeNodeId(edge.from);
    const toId = sanitizeNodeId(edge.to);
    return `${fromId} --> ${toId}`;
  });
}

/**
 * Sanitize node ID for Mermaid syntax
 * @param nodeId Raw node identifier
 * @returns Sanitized node identifier safe for Mermaid
 */
function sanitizeNodeId(nodeId: string): string {
  // Replace characters that might cause issues in Mermaid
  return nodeId.replace(/[^a-zA-Z0-9_]/g, '_');
}
