import { MultirepoIndex, CrossRepoEdge } from "../types.js";
import { GroqAnalyzer } from "./groq-analyzer.js";

function sanitizeId(id: string): string {
  // Mermaid identifiers: letters, numbers, underscore are safest
  return "R_" + id.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Infer purpose/context from file paths
 */
function inferPurposeFromPath(filePath: string): string | null {
  const path = filePath.toLowerCase();
  
  // Common patterns to detect purpose
  const patterns = [
    { pattern: /auth|login|signin|signup|register/, purpose: "Authentication" },
    { pattern: /user|profile|account/, purpose: "User Management" },
    { pattern: /payment|billing|checkout|stripe|paypal/, purpose: "Payment" },
    { pattern: /order|cart|shop|product|inventory/, purpose: "E-commerce" },
    { pattern: /notification|email|sms|push/, purpose: "Notifications" },
    { pattern: /upload|file|storage|media/, purpose: "File Management" },
    { pattern: /search|query|filter/, purpose: "Search" },
    { pattern: /admin|dashboard|manage/, purpose: "Administration" },
    { pattern: /api|endpoint|route/, purpose: "API" },
    { pattern: /database|db|migration/, purpose: "Database" },
    { pattern: /config|setting|env/, purpose: "Configuration" },
    { pattern: /log|audit|monitor/, purpose: "Monitoring" },
    { pattern: /test|spec|mock/, purpose: "Testing" },
    { pattern: /webhook|integration|external/, purpose: "Integration" }
  ];
  
  for (const { pattern, purpose } of patterns) {
    if (pattern.test(path)) {
      return purpose;
    }
  }
  
  return null;
}

/**
 * Generate an enhanced, descriptive edge label using all available context
 */
function generateEnhancedEdgeLabel(edge: CrossRepoEdge, index: MultirepoIndex): string {
  const parts: string[] = [];
  
  // 1. Start with Groq analysis if available (highest priority)
  if (edge.groqAnalysis?.relationship) {
    const relationship = edge.groqAnalysis.relationship
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
    parts.push(`${relationship}:`);
  }
  
  // 2. Add feature context if available
  const features = new Set<string>();
  for (const endpointId of edge.endpointIds) {
    const endpoint = index.endpoints[endpointId];
    if (endpoint?.feature) {
      features.add(endpoint.feature);
    }
  }
  if (features.size > 0) {
    const featureStr = Array.from(features).join(', ');
    parts.push(`Feature: ${featureStr}`);
  }
  
  // 3. Infer purpose from file context
  const purposes = new Set<string>();
  
  // Check endpoint files
  for (const endpointId of edge.endpointIds) {
    const endpoint = index.endpoints[endpointId];
    if (endpoint) {
      const purpose = inferPurposeFromPath(endpoint.relFile);
      if (purpose) purposes.add(purpose);
    }
  }
  
  // Check usage files
  for (const usageId of edge.usageIds) {
    const usage = index.usages[usageId];
    if (usage) {
      const purpose = inferPurposeFromPath(usage.relFile);
      if (purpose) purposes.add(purpose);
    }
  }
  
  if (purposes.size > 0) {
    const purposeStr = Array.from(purposes).slice(0, 2).join('/'); // Limit to 2 purposes
    parts.push(`Context: ${purposeStr}`);
  }
  
  // 4. Add the actual endpoint information
  let endpointInfo = edge.label || 'CALL';
  
  // If we have Groq analysis, prefer the cleaner endpoint flow
  if (edge.groqAnalysis && endpointInfo.includes('→')) {
    // Keep the Groq analysis format which is already clean
    parts.push(endpointInfo);
  } else {
    // Clean up the basic format
    endpointInfo = endpointInfo.replace(/\s*\([^)]*\)\s*$/, ''); // Remove URL part if present
    parts.push(endpointInfo);
  }
  
  // 5. Join all parts together with proper spacing
  let result = parts.join(' | ');
  
  // 6. Smart truncation (increased from 50 to 120 characters)
  const maxLength = 120;
  if (result.length > maxLength) {
    // Try to truncate intelligently by removing less important parts
    if (purposes.size > 0 && result.length > maxLength) {
      // Remove context info first
      result = parts.filter(p => !p.startsWith('Context:')).join(' | ');
    }
    
    if (result.length > maxLength) {
      // Remove feature info
      result = parts.filter(p => !p.startsWith('Feature:')).join(' | ');
    }
    
    if (result.length > maxLength) {
      // Final truncation
      result = result.substring(0, maxLength - 3) + '...';
    }
  }
  
  return result;
}

export function generateMermaid(index: MultirepoIndex): string {
  // Legacy fallback function - use generateAIMermaid for AI-powered generation
  const lines: string[] = [];
  lines.push("graph LR");

  const repoIds = Object.keys(index.repos);
  // Ensure nodes exist even if they have no edges
  for (const repoId of repoIds) {
    const nodeId = sanitizeId(repoId);
    const label = index.repos[repoId].name || repoId;
    lines.push(`  ${nodeId}[${escapeLabel(label)}]`);
  }

  // Edges with enhanced descriptive labels
  for (const e of index.edges) {
    const from = sanitizeId(e.fromRepoId);
    const to = sanitizeId(e.toRepoId);
    
    const enhancedLabel = generateEnhancedEdgeLabel(e, index);
    const edgeLabel = `${enhancedLabel} (${e.count})`;
    lines.push(`  ${from} -- "${escapeLabel(edgeLabel)}" --> ${to}`);
  }

  return lines.join("\n");
}

/**
 * Generate AI-powered Mermaid graph using Groq analysis
 */
export async function generateAIMermaid(index: MultirepoIndex): Promise<string> {
  try {
    const analyzer = new GroqAnalyzer();
    return await analyzer.generateAIMermaidGraph(index);
  } catch (error) {
    console.error('AI Mermaid generation failed, falling back to manual generation:', error);
    return generateMermaid(index);
  }
}

/**
 * Test the Mermaid syntax with a sample edge to ensure it's valid
 */
export function testMermaidSyntax(): string {
  const testIndex: MultirepoIndex = {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    configHash: 'test',
    repos: {
      'service-a': { id: 'service-a', name: 'Service A', path: '/test/a', detectedLanguages: ['typescript'] },
      'service-b': { id: 'service-b', name: 'Service B', path: '/test/b', detectedLanguages: ['python'] }
    },
    endpoints: {},
    usages: {},
    edges: [{
      fromRepoId: 'service-a',
      toRepoId: 'service-b',
      label: 'Authentication: POST /auth/login',
      count: 2,
      endpointIds: [],
      usageIds: [],
      groqAnalysis: {
        relationship: 'user_authentication',
        confidence: 0.9,
        reasoning: 'Service A authenticates users via Service B'
      }
    }]
  };
  
  return generateMermaid(testIndex);
}

function escapeLabel(s: string): string {
  // Mermaid-specific escaping - be more conservative
  return s
    .replace(/"/g, '\\"')           // Escape quotes (required for edge labels)
    .replace(/\n/g, ' ')            // Replace newlines with spaces
    .replace(/\r/g, '')             // Remove carriage returns
    .replace(/\t/g, ' ')            // Replace tabs with spaces
    .replace(/\s+/g, ' ')           // Normalize multiple spaces
    .trim();                        // Remove leading/trailing whitespace
}
