export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "ALL";

export interface RepoConfig {
  name?: string;
  path?: string; // local absolute or relative path
  url?: string; // optional: remote URL (not cloned in MVP)
  branch?: string;
}

export interface FeatureGlobConfig {
  name: string;
  include: string[];
  exclude?: string[];
}

export interface UrlBaseConfig {
  name?: string;
  repo?: string;
  baseUrl: string; // e.g. https://api.example.com or http://localhost:3000
}

export interface MultirepoConfig {
  roots?: string[]; // directories to recursively scan for git repos
  repos?: RepoConfig[]; // explicit repos to include (local path or remote url)
  featureGlobs?: FeatureGlobConfig[]; // feature mappings
  urlBases?: UrlBaseConfig[]; // base URL hints for mapping usages->endpoints
  excludeGlobs?: string[]; // file/directory patterns to exclude
  includeFileExtensions?: string[]; // e.g. [".ts",".js",".py",".json",".yaml",".yml"]
  indexPath?: string; // optional: custom index path for persistence
}

export interface RepoInfo {
  id: string; // stable id (prefer name, else folder name)
  name: string;
  path: string; // absolute path
  url?: string;
  branch?: string;
  headCommit?: string | null;
  detectedLanguages?: string[];
}

export interface Endpoint {
  id: string;
  repoId: string;
  feature?: string;
  method: HttpMethod;
  path: string; // e.g. "/api/users/:id"
  framework?: string; // express|fastify|fastapi|flask|openapi|unknown
  file: string; // absolute path
  relFile: string; // path relative to repo root
  line: number;
  sourceType: "code" | "openapi";
}

export interface Usage {
  id: string;
  repoId: string;
  file: string; // absolute path
  relFile: string; // relative to repo
  line: number;
  method?: HttpMethod;
  endpointPath: string; // the path string found in code
  url?: string; // if a full URL was detected
  snippet?: string; // small surrounding snippet
  tool: "fetch" | "axios" | "requests" | "http" | "unknown";
}

export interface CrossRepoEdge {
  fromRepoId: string; // consumer
  toRepoId: string; // provider (owns endpoint)
  label: string; // e.g. "GET /api/users"
  count: number; // number of usages
  endpointIds: string[];
  usageIds: string[];
}

export interface MultirepoIndex {
  version: number;
  createdAt: string;
  updatedAt: string;
  configHash: string;
  repos: Record<string, RepoInfo>;
  endpoints: Record<string, Endpoint>;
  usages: Record<string, Usage>;
  // derived
  edges: CrossRepoEdge[];
  lastScanAt?: string;
  scanStats?: {
    reposScanned: number;
    filesScanned: number;
    endpointsFound: number;
    usagesFound: number;
    durationMs: number;
  };
}

export interface ScanSummary {
  reposDiscovered: number;
  reposScanned: number;
  filesScanned: number;
  endpointsFound: number;
  usagesFound: number;
  durationMs: number;
  changedRepos: string[];
}

export interface ImpactAnalysisInput {
  repoId?: string;
  file?: string;
  endpoint?: {
    method: HttpMethod;
    path: string;
  };
}

export interface ImpactAnalysisResult {
  impactedRepos: {
    repoId: string;
    reason: string;
    evidence: string[];
  }[];
  suggestions: string[];
}
