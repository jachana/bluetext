// Configuration types for the Multirepo MCP Server

export type RepoRef = {
  name: string;
  path: string;      // absolute or relative local path (MVP)
  // future: url?: string; branch?: string;
};

export type RepoConfig = {
  repos: RepoRef[];
  options?: {
    cloneDir?: string;     // future use
    includeDevDeps?: boolean;
  };
};
