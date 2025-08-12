import { MultirepoIndex } from "../types.js";

function sanitizeId(id: string): string {
  // Mermaid identifiers: letters, numbers, underscore are safest
  return "R_" + id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function generateMermaid(index: MultirepoIndex): string {
  const lines: string[] = [];
  lines.push("graph LR");

  const repoIds = Object.keys(index.repos);
  // Ensure nodes exist even if they have no edges
  for (const repoId of repoIds) {
    const nodeId = sanitizeId(repoId);
    const label = index.repos[repoId].name || repoId;
    lines.push(`  ${nodeId}[${escapeLabel(label)}]`);
  }

  // Edges with labels: "METHOD PATH (count)"
  for (const e of index.edges) {
    const from = sanitizeId(e.fromRepoId);
    const to = sanitizeId(e.toRepoId);
    const edgeLabel = `${e.label} (${e.count})`;
    lines.push(`  ${from} -- "${escapeLabel(edgeLabel)}" --> ${to}`);
  }

  return lines.join("\n");
}

function escapeLabel(s: string): string {
  // Escape quotes for Mermaid labels
  return s.replace(/"/g, '\\"');
}
