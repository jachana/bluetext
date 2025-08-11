// Graph types for the unified repository dependency graph

export type GraphNode = {
  id: string;              // repo name
  kind: 'repo';
  label: string;
};

export type GraphEdge = {
  from: string;            // source repo id
  to: string;              // target repo id
  relation: 'depends_on';
};

export type UnifiedGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  generatedAt: string;     // ISO timestamp
};
