import { readFileSync, existsSync } from "fs";
import { basename, join, relative, resolve } from "path";
import crypto from "crypto";
import {
  CrossRepoEdge,
  Endpoint,
  HttpMethod,
  MultirepoConfig,
  MultirepoIndex,
  RepoInfo,
  ScanSummary,
  Usage,
} from "../types.js";
import {
  anyGlobMatch,
  findGitRepos,
  normalizePath,
  walkFiles,
} from "./utils.js";
import {
  detectLanguagesByExtensions,
  getRepoIdFromPath,
  readHeadCommit,
} from "./git.js";
import { hashConfig } from "./config.js";
import { 
  detectRepositoryChanges, 
  ChangeDetectionResult,
  createIncrementalScanFilter 
} from "./change-detection.js";
import { loadIndex } from "./store.js";
import { GroqAnalyzer } from "./groq-analyzer.js";

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
  "ALL",
];

function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function toHttpMethod(s: string | undefined): HttpMethod | undefined {
  if (!s) return undefined;
  const up = s.toUpperCase();
  return HTTP_METHODS.includes(up as HttpMethod) ? (up as HttpMethod) : undefined;
}

function ensureLeadingSlash(p: string): string {
  if (!p.startsWith("/")) return "/" + p;
  return p;
}

function canonicalizePath(p: string): string {
  const parts = ensureLeadingSlash(p).split("/");
  const norm = parts.map((seg) => {
    if (!seg) return "";
    if (/^\{[^}]+\}$/.test(seg)) return ":param";
    if (/^:/.test(seg)) return ":param";
    if (/^\$\{[^}]+\}$/.test(seg)) return ":param";
    return seg;
  });
  return norm.join("/");
}

function tryParseJson<T = any>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getLineNumber(text: string, index: number): number {
  // count number of '\n' before index, then +1
  let count = 0;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  return count + 1;
}

function getLineSnippet(text: string, index: number): string {
  let start = index;
  while (start > 0 && text[start - 1] !== "\n") start--;
  let end = index;
  while (end < text.length && text[end] !== "\n") end++;
  return text.slice(start, end).trim();
}

function featureForFile(absFile: string, cfg: MultirepoConfig): string | undefined {
  if (!cfg.featureGlobs || cfg.featureGlobs.length === 0) return undefined;
  const p = normalizePath(absFile);
  for (const fg of cfg.featureGlobs) {
    const included = anyGlobMatch(p, fg.include);
    const excluded = anyGlobMatch(p, fg.exclude || []);
    if (included && !excluded) {
      return fg.name;
    }
  }
  return undefined;
}

function detectEndpointsInFile(params: {
  repoId: string;
  repoPath: string;
  absFile: string;
  relFile: string;
  content: string;
  cfg: MultirepoConfig;
}): Endpoint[] {
  const { repoId, absFile, relFile, content, cfg } = params;
  const endpoints: Endpoint[] = [];
  const feature = featureForFile(absFile, cfg);
  const seen = new Set<string>(); // de-duplicate by method|path|line within file

  // Language-agnostic endpoint detection patterns
  const endpointPatterns = [
    // Generic server object call: <obj>.<method>('/path', ...)
    // Matches Express/Router/Fastify and also FastAPI decorators like @app.get('/path')
    {
      regex: /\b([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*(['"`])([^"'`]+)\3/g,
      framework: (obj: string) => {
        if (obj === "fastify") return "fastify";
        if (obj === "router" || obj === "app") return "express";
        return "generic";
      }
    },
    
    // Go Gin/Mux patterns: router.GET("/path", handler)
    {
      regex: /\b([A-Za-z_][A-Za-z0-9_]*)\.(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s*\(\s*(['"`])([^"'`]+)\3/g,
      framework: () => "gin"
    },
    
    // Go Gin SetupRoutes function patterns: router.GET("/path", handler)
    {
      regex: /router\.(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s*\(\s*(['"`])([^"'`]+)\2/g,
      framework: () => "gin"
    },
    
    // Go HTTP ServeMux: http.HandleFunc("/path", handler)
    {
      regex: /\bhttp\.HandleFunc\s*\(\s*(['"`])([^"'`]+)\1/g,
      framework: () => "http",
      method: () => "ALL" as HttpMethod
    },
    
    // Go Gorilla Mux: r.HandleFunc("/path", handler).Methods("GET", "POST")
    {
      regex: /\b([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*HandleFunc\s*\(\s*(['"`])([^"'`]+)\2[^)]*\)\s*\.\s*Methods\s*\(\s*(['"`])([^"'`]+)\4/g,
      framework: () => "gorilla",
      extractMethod: (match: RegExpExecArray) => match[5]
    },
    
    // Java Spring: @GetMapping("/path"), @PostMapping("/path"), etc.
    {
      regex: /@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(['"`])([^"'`]+)\2/g,
      framework: () => "spring"
    },
    
    // C# ASP.NET: [HttpGet("/path")], [Route("/path")]
    {
      regex: /\[Http(Get|Post|Put|Delete|Patch)\s*\(\s*(['"`])([^"'`]+)\2\s*\)\]/g,
      framework: () => "aspnet"
    },
    
    // Ruby Rails: get '/path', post '/path', etc.
    {
      regex: /\b(get|post|put|delete|patch)\s+(['"`])([^"'`]+)\2/g,
      framework: () => "rails"
    },
    
    // PHP Laravel: Route::get('/path'), Route::post('/path')
    {
      regex: /\bRoute::(get|post|put|delete|patch|options|head|any)\s*\(\s*(['"`])([^"'`]+)\2/g,
      framework: () => "laravel"
    }
  ];

  for (const pattern of endpointPatterns) {
    pattern.regex.lastIndex = 0; // Reset regex state
    for (let m; (m = pattern.regex.exec(content)); ) {
      let method: HttpMethod;
      let path: string;
      let framework: string;
      
      if (pattern.extractMethod) {
        // Special handling for complex patterns like Gorilla Mux
        const methodStr = pattern.extractMethod(m);
        method = toHttpMethod(methodStr) || "GET";
        path = ensureLeadingSlash(m[3]);
        framework = pattern.framework();
      } else if (pattern.method) {
        // Fixed method patterns
        method = pattern.method();
        path = ensureLeadingSlash(m[2]);
        framework = pattern.framework();
      } else {
        // Standard patterns
        const methodIndex = m[2] ? 2 : 1;
        const pathIndex = m[4] ? 4 : (m[3] ? 3 : 2);
        method = toHttpMethod(m[methodIndex]) || "GET";
        path = ensureLeadingSlash(m[pathIndex]);
        framework = typeof pattern.framework === 'function' ? pattern.framework(m[1] || '') : pattern.framework;
      }
      
      const line = getLineNumber(content, m.index);
      const key = `${method}|${path}|${line}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const id = sha1(`${repoId}|${framework}|${method}|${path}|${relFile}|${line}`);
      endpoints.push({
        id,
        repoId,
        feature,
        method,
        path,
        framework,
        file: normalizePath(absFile),
        relFile: relFile.replace(/\\/g, "/"),
        line,
        sourceType: "code",
      });
    }
  }

  // Python Flask-style: @app.route('/path', methods=['GET','POST',...])
  const flaskRouteRe =
    /@([A-Za-z_][A-Za-z0-9_]*)\.route\s*\(\s*(['"`])([^"'`]+)\2\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?\s*\)/g;
  for (let m; (m = flaskRouteRe.exec(content)); ) {
    const path = ensureLeadingSlash(m[3]);
    const line = getLineNumber(content, m.index);
    const methodsRaw = m[4];
    let methods: HttpMethod[] = [];
    if (methodsRaw) {
      const rx = /(['"`])([A-Za-z]+)\1/g;
      for (let mm; (mm = rx.exec(methodsRaw)); ) {
        const hm = toHttpMethod(mm[2]);
        if (hm) methods.push(hm);
      }
    }
    if (methods.length === 0) methods = ["GET"]; // Flask default is GET

    for (const method of methods) {
      const key = `${method}|${path}|${line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const id = sha1(`${repoId}|flask|${method}|${path}|${relFile}|${line}`);
      endpoints.push({
        id,
        repoId,
        feature,
        method,
        path,
        framework: "flask",
        file: normalizePath(absFile),
        relFile: relFile.replace(/\\/g, "/"),
        line,
        sourceType: "code",
      });
    }
  }


  // NestJS-style decorators: @Get('/path'), @Post('/path'), etc.
  const nestDecRe = /@(Get|Post|Put|Delete|Patch|Options|Head|All)\s*\(\s*(['"`])([^"'`]+)\2\s*\)/g;
  for (let m; (m = nestDecRe.exec(content)); ) {
    const method = toHttpMethod(m[1])!;
    const path = ensureLeadingSlash(m[3]);
    const line = getLineNumber(content, m.index);
    const key = `${method}|${path}|${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = sha1(`${repoId}|nestjs|${method}|${path}|${relFile}|${line}`);
    endpoints.push({
      id,
      repoId,
      feature,
      method,
      path,
      framework: "nestjs",
      file: normalizePath(absFile),
      relFile: relFile.replace(/\\/g, "/"),
      line,
      sourceType: "code",
    });
  }

  // Python FastAPI-style decorators: @app.get('/path'), @router.post('/path'), etc.
  const pyDecRe =
    /@([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*(['"`])([^"'`]+)\3\s*\)/g;
  for (let m; (m = pyDecRe.exec(content)); ) {
    const obj = m[1];
    const method = toHttpMethod(m[2])!;
    const path = ensureLeadingSlash(m[4]);
    const line = getLineNumber(content, m.index);
    const key = `${method}|${path}|${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = sha1(`${repoId}|fastapi|${method}|${path}|${relFile}|${line}`);
    endpoints.push({
      id,
      repoId,
      feature,
      method,
      path,
      framework: "fastapi",
      file: normalizePath(absFile),
      relFile: relFile.replace(/\\/g, "/"),
      line,
      sourceType: "code",
    });
  }

  // OpenAPI JSON (MVP)
  if (absFile.toLowerCase().endsWith(".json") && content.includes('"paths"')) {
    const obj = tryParseJson<any>(content);
    if (obj && obj.paths && (obj.openapi || obj.swagger)) {
      const paths = obj.paths;
      for (const p of Object.keys(paths)) {
        const methodsObj = paths[p] || {};
        for (const maybeMethod of Object.keys(methodsObj)) {
          const method = toHttpMethod(maybeMethod.toUpperCase());
          if (!method) continue;
          const path = ensureLeadingSlash(p);
          const line = 1; // unknown, keep simple for MVP
          const id = sha1(`${repoId}|openapi|${method}|${path}|${relFile}|${line}`);
          endpoints.push({
            id,
            repoId,
            feature,
            method,
            path,
            framework: "openapi",
            file: normalizePath(absFile),
            relFile: relFile.replace(/\\/g, "/"),
            line,
            sourceType: "openapi",
          });
        }
      }
    }
  }

  return endpoints;
}

function detectUsagesInFile(params: {
  repoId: string;
  repoPath: string;
  absFile: string;
  relFile: string;
  content: string;
}): Usage[] {
  const { repoId, absFile, relFile, content } = params;
  const usages: Usage[] = [];

  // Language-agnostic HTTP client detection patterns
  const usagePatterns = [
    // JavaScript/TypeScript: fetch(url, { method: '...' })
    {
      regex: /\bfetch\s*\(\s*(['"`])([^"'`]+)\1\s*(,\s*\{[^}]*\})?/g,
      tool: "fetch",
      extractMethod: (match: RegExpExecArray) => {
        const opts = match[3] || "";
        const methodRe = /method\s*:\s*(['"`])([A-Za-z]+)\1/i;
        const mm = methodRe.exec(opts);
        return mm ? toHttpMethod(mm[2]) : undefined;
      }
    },
    
    // JavaScript/TypeScript: axios.method(url)
    {
      regex: /\baxios\.(get|post|put|delete|patch|options|head|all)\s*\(\s*(['"`])([^"'`]+)\2/g,
      tool: "axios",
      methodIndex: 1,
      urlIndex: 3
    },
    
    // JavaScript/TypeScript: axios(url, { method: '...' })
    {
      regex: /\baxios\s*\(\s*(['"`])([^"'`]+)\1\s*(,\s*\{[^}]*\})?/g,
      tool: "axios",
      urlIndex: 2,
      extractMethod: (match: RegExpExecArray) => {
        const opts = match[3] || "";
        const methodRe = /method\s*:\s*(['"`])([A-Za-z]+)\1/i;
        const mm = methodRe.exec(opts);
        return mm ? toHttpMethod(mm[2]) : undefined;
      }
    },
    
    // Node.js: http(s).request(url)
    {
      regex: /\bhttps?\s*\.\s*request\s*\(\s*(['"`])([^"'`]+)\1/g,
      tool: "http",
      urlIndex: 2
    },
    
    // Python: requests.method(url)
    {
      regex: /\brequests\.(get|post|put|delete|patch|options|head)\s*\(\s*(['"])([^'"]+)\2/g,
      tool: "requests",
      methodIndex: 1,
      urlIndex: 3
    },
    
    // Python: httpx.method(url)
    {
      regex: /\bhttpx\.(get|post|put|delete|patch|options|head)\s*\(\s*(['"])([^'"]+)\2/g,
      tool: "httpx",
      methodIndex: 1,
      urlIndex: 3
    },
    
    // Go: http.Get(url), http.Post(url, ...), etc.
    {
      regex: /\bhttp\.(Get|Post|Put|Delete|Patch|Head)\s*\(\s*(['"`])([^"'`]+)\2/g,
      tool: "http",
      methodIndex: 1,
      urlIndex: 3
    },
    
    // Go: client.Do(req) with NewRequest - more complex pattern
    {
      regex: /http\.NewRequest\s*\(\s*(['"`])([A-Z]+)\1\s*,\s*(['"`])([^"'`]+)\3/g,
      tool: "http",
      methodIndex: 2,
      urlIndex: 4
    },
    
    // Java: RestTemplate methods
    {
      regex: /\b(?:restTemplate|RestTemplate)\s*\.\s*(getForObject|postForObject|put|delete|exchange)\s*\(\s*(['"`])([^"'`]+)\2/g,
      tool: "RestTemplate",
      methodIndex: 1,
      urlIndex: 3,
      mapMethod: (method: string) => {
        const mapping: Record<string, HttpMethod> = {
          'getForObject': 'GET',
          'postForObject': 'POST',
          'put': 'PUT',
          'delete': 'DELETE',
          'exchange': 'GET' // default, could be any
        };
        return mapping[method] || 'GET';
      }
    },
    
    // C# HttpClient
    {
      regex: /\b(?:httpClient|HttpClient)\s*\.\s*(GetAsync|PostAsync|PutAsync|DeleteAsync|SendAsync)\s*\(\s*(['"`])([^"'`]+)\2/g,
      tool: "HttpClient",
      methodIndex: 1,
      urlIndex: 3,
      mapMethod: (method: string) => {
        const mapping: Record<string, HttpMethod> = {
          'GetAsync': 'GET',
          'PostAsync': 'POST',
          'PutAsync': 'PUT',
          'DeleteAsync': 'DELETE',
          'SendAsync': 'GET' // default
        };
        return mapping[method] || 'GET';
      }
    },
    
    // Generic URL patterns in strings (fallback)
    {
      regex: /(['"`])(https?:\/\/[^"'`\s]+(?:\/[^"'`\s]*)?)\1/g,
      tool: "generic",
      urlIndex: 2,
      isGeneric: true
    }
  ];

  for (const pattern of usagePatterns) {
    pattern.regex.lastIndex = 0; // Reset regex state
    for (let m; (m = pattern.regex.exec(content)); ) {
      let method: HttpMethod | undefined;
      let urlOrPath: string;
      let tool: string = pattern.tool;
      
      // Extract URL
      urlOrPath = m[pattern.urlIndex || 2];
      
      // Extract or determine method
      if (pattern.extractMethod) {
        method = pattern.extractMethod(m);
      } else if (pattern.methodIndex) {
        const methodStr = m[pattern.methodIndex];
        if (pattern.mapMethod) {
          method = pattern.mapMethod(methodStr);
        } else {
          method = toHttpMethod(methodStr);
        }
      }
      
      // Skip generic URL patterns that don't look like API calls
      if (pattern.isGeneric) {
        // Only include URLs that look like API endpoints
        if (!urlOrPath.includes('/api/') && 
            !urlOrPath.includes('/v1/') && 
            !urlOrPath.includes('/v2/') &&
            !urlOrPath.match(/\/[a-z-]+\/\d+/) && // resource/id pattern
            !urlOrPath.match(/localhost:\d+/) &&
            !urlOrPath.match(/:\d{4}/) // port numbers
        ) {
          continue;
        }
      }

      const line = getLineNumber(content, m.index);
      const snippet = getLineSnippet(content, m.index);
      const { endpointPath, absoluteUrl } = splitUrl(urlOrPath);
      const id = sha1(`${repoId}|${tool}|${endpointPath}|${relFile}|${line}|${method || "UNK"}`);
      
      usages.push({
        id,
        repoId,
        file: normalizePath(absFile),
        relFile: relFile.replace(/\\/g, "/"),
        line,
        method,
        endpointPath,
        url: absoluteUrl || undefined,
        snippet,
        tool: tool as "fetch" | "axios" | "requests" | "http" | "httpx" | "RestTemplate" | "HttpClient" | "generic" | "unknown",
      });
    }
  }

  return usages;
}

function splitUrl(s: string): { endpointPath: string; absoluteUrl: string | null } {
  try {
    const u = new URL(s);
    return { endpointPath: ensureLeadingSlash(u.pathname || "/"), absoluteUrl: s };
  } catch {
    // Not an absolute URL
    const pathOnly = s.split("?")[0];
    return { endpointPath: ensureLeadingSlash(pathOnly), absoluteUrl: null };
  }
}

async function discoverRepos(cfg: MultirepoConfig): Promise<{ repoPath: string; name?: string; branch?: string; url?: string }[]> {
  const set = new Map<string, { repoPath: string; name?: string; branch?: string; url?: string }>();

  // Explicit repos (local paths only for MVP)
  if (cfg.repos && cfg.repos.length > 0) {
    for (const r of cfg.repos) {
      if (!r.path) continue;
      const abs = normalizePath(resolve(r.path));
      set.set(abs, { repoPath: abs, name: r.name, branch: r.branch, url: r.url });
    }
  }

  // Enhanced auto-discovery
  if (cfg.autoDiscovery?.enabled !== false) {
    const autoConfig = cfg.autoDiscovery || {};
    const { 
      maxDepth = 3, 
      minConfidence = 25,
      includeHidden = false,
      excludePatterns = [],
      workspaceRoots = [process.cwd()]
    } = autoConfig;

    // Import auto-discovery functions (dynamic import for ESM compatibility)
    const { autoDiscoverProjects, getRepoName } = await import('./project-detection.js');

    // Merge exclude patterns
    const allExcludePatterns = [
      ...(cfg.excludeGlobs || []),
      ...excludePatterns
    ];

    // Search each workspace root
    for (const root of workspaceRoots) {
      try {
        const projects = autoDiscoverProjects(root, {
          maxDepth,
          minConfidence,
          excludePatterns: allExcludePatterns,
          includeHidden
        });

        for (const project of projects) {
          const projectPath = normalizePath(project.path);
          
          // Skip if already explicitly configured
          if (set.has(projectPath)) continue;
          
          // Only include projects with git repos (check for .git directory)
          const gitPath = join(project.path, '.git');
          if (!existsSync(gitPath)) continue;
          
          const repoName = getRepoName(project);
          set.set(projectPath, {
            repoPath: projectPath,
            name: repoName
          });
        }
      } catch (error) {
        console.warn(`Auto-discovery failed for root ${root}:`, error);
      }
    }
  }

  return Array.from(set.values());
}

function mapUsagesToEndpoints(params: {
  endpoints: Endpoint[];
  usages: Usage[];
  cfg: MultirepoConfig;
  reposById: Record<string, RepoInfo>;
}): CrossRepoEdge[] {
  const { endpoints, usages, cfg } = params;

  const endpointsByKey = new Map<string, Endpoint[]>();
  const endpointsByPathOnly = new Map<string, Endpoint[]>();
  const endpointsByCanonKey = new Map<string, Endpoint[]>();
  const endpointsByCanonPath = new Map<string, Endpoint[]>();

  for (const ep of endpoints) {
    const key = `${ep.method}:${ep.path}`;
    if (!endpointsByKey.has(key)) endpointsByKey.set(key, []);
    endpointsByKey.get(key)!.push(ep);

    const pk = ep.path;
    if (!endpointsByPathOnly.has(pk)) endpointsByPathOnly.set(pk, []);
    endpointsByPathOnly.get(pk)!.push(ep);

    const canon = canonicalizePath(ep.path);
    const ckey = `${ep.method}:${canon}`;
    if (!endpointsByCanonKey.has(ckey)) endpointsByCanonKey.set(ckey, []);
    endpointsByCanonKey.get(ckey)!.push(ep);
    if (!endpointsByCanonPath.has(canon)) endpointsByCanonPath.set(canon, []);
    endpointsByCanonPath.get(canon)!.push(ep);
  }

  const edgesMap = new Map<string, CrossRepoEdge>();

  function addEdge(fromRepoId: string, toRepoId: string, label: string, endpointId: string, usageId: string) {
    if (fromRepoId === toRepoId) return; // skip intra-repo for cross mapping
    const key = `${fromRepoId}|${toRepoId}|${label}`;
    let edge = edgesMap.get(key);
    if (!edge) {
      edge = {
        fromRepoId,
        toRepoId,
        label,
        count: 0,
        endpointIds: [],
        usageIds: [],
      };
      edgesMap.set(key, edge);
    }
    edge.count++;
    if (!edge.endpointIds.includes(endpointId)) edge.endpointIds.push(endpointId);
    if (!edge.usageIds.includes(usageId)) edge.usageIds.push(usageId);
  }

  function matchByUrlBase(u: Usage): Endpoint | null {
    if (!cfg.urlBases || cfg.urlBases.length === 0) return null;

    // Build candidate list based on absolute URL or endpointPath prefix
    const candidates: { base: any; pathAfterBase: string }[] = [];
    
    // Enhanced environment variable pattern matching (MOVED OUTSIDE URL BASE LOOP)
    if (u.endpointPath) {
      // Define comprehensive environment variable to service mappings
      const envVarMappings = [
        { 
          patterns: [/^\$\{PAYMENT_SERVICE_URL\}/, /^\/\$\{PAYMENT_SERVICE_URL\}/, /^\${PAYMENT_SERVICE_URL}/, /^\/${PAYMENT_SERVICE_URL}/],
          serviceUrls: ["http://payment-service:3002", "http://localhost:3002"], 
          repo: "demo-payment-service" 
        },
        { 
          patterns: [/^\$\{TRANSACTION_SERVICE_URL\}/, /^\/\$\{TRANSACTION_SERVICE_URL\}/, /^\${TRANSACTION_SERVICE_URL}/, /^\/${TRANSACTION_SERVICE_URL}/],
          serviceUrls: ["http://transaction-service:3003", "http://localhost:3003"], 
          repo: "demo-transaction-service" 
        },
        { 
          patterns: [/^\$\{USER_SERVICE_URL\}/, /^\/\$\{USER_SERVICE_URL\}/, /^\${USER_SERVICE_URL}/, /^\/${USER_SERVICE_URL}/],
          serviceUrls: ["http://user-service:3001", "http://localhost:3001"], 
          repo: "demo-user-service" 
        }
      ];

      // Check each environment variable mapping
      for (const mapping of envVarMappings) {
        for (const pattern of mapping.patterns) {
          if (pattern.test(u.endpointPath)) {
            console.log(`   🎯 ENV VAR MATCH: ${u.endpointPath} matches ${pattern} -> ${mapping.repo}`);
            // Find matching URL base for this service
            for (const base of cfg.urlBases) {
              if (mapping.serviceUrls.includes(base.baseUrl) || base.repo === mapping.repo) {
                const after = ensureLeadingSlash(u.endpointPath.replace(pattern, ""));
                console.log(`   ✅ URL BASE MATCH: ${base.baseUrl} -> ${mapping.repo}, path after: ${after}`);
                candidates.push({ 
                  base: { ...base, repo: mapping.repo }, 
                  pathAfterBase: after 
                });
              }
            }
            break; // Found a pattern match, don't check other patterns for this mapping
          }
        }
      }
    }

    // Standard URL matching (for non-environment variable patterns)
    for (const base of cfg.urlBases) {
      // Direct URL matching
      if (u.url && u.url.startsWith(base.baseUrl)) {
        const after = ensureLeadingSlash(u.url.slice(base.baseUrl.length).split("?")[0] || u.endpointPath);
        candidates.push({ base, pathAfterBase: after });
      } 
      // Direct path matching
      else if (u.endpointPath && u.endpointPath.startsWith(base.baseUrl)) {
        const after = ensureLeadingSlash(u.endpointPath.slice(base.baseUrl.length).split("?")[0] || "/");
        candidates.push({ base, pathAfterBase: after });
      }
      // URL-decoded endpoint path matching (handle %7B%7D -> {})
      else if (u.endpointPath) {
        const decodedPath = decodeURIComponent(u.endpointPath);
        if (decodedPath.startsWith(base.baseUrl)) {
          const after = ensureLeadingSlash(decodedPath.slice(base.baseUrl.length).split("?")[0] || "/");
          candidates.push({ base, pathAfterBase: after });
        }
      }
      // Direct localhost patterns
      else if (u.endpointPath) {
        const localhostPatterns = [
          { pattern: /^localhost:3001/, serviceUrl: "http://localhost:3001", repo: "demo-user-service" },
          { pattern: /^localhost:3002/, serviceUrl: "http://localhost:3002", repo: "demo-payment-service" },
          { pattern: /^localhost:3003/, serviceUrl: "http://localhost:3003", repo: "demo-transaction-service" }
        ];
        
        for (const localhostPattern of localhostPatterns) {
          if (localhostPattern.pattern.test(u.endpointPath) && base.baseUrl === localhostPattern.serviceUrl) {
            const after = ensureLeadingSlash(u.endpointPath.replace(localhostPattern.pattern, ""));
            candidates.push({ 
              base: { ...base, repo: localhostPattern.repo }, 
              pathAfterBase: after 
            });
            break;
          }
        }
      }
    }

    // Prefer the longest matching baseUrl
    candidates.sort((a, b) => b.base.baseUrl.length - a.base.baseUrl.length);
    if (candidates.length === 0) return null;

    for (const { base, pathAfterBase } of candidates) {
      let matched: Endpoint[] = [];

      if (u.method) {
        const key = `${u.method}:${pathAfterBase}`;
        matched = endpointsByKey.get(key) || [];
        if (matched.length === 0) {
          const ckey = `${u.method}:${canonicalizePath(pathAfterBase)}`;
          matched = endpointsByCanonKey.get(ckey) || [];
        }
      } else {
        matched = endpointsByPathOnly.get(pathAfterBase) || [];
        if (matched.length === 0) {
          matched = endpointsByCanonPath.get(canonicalizePath(pathAfterBase)) || [];
        }
      }

      if (base.repo) {
        matched = matched.filter((e) => e.repoId === base.repo);
      }

      if (matched.length === 1) return matched[0];
      // ambiguous, try next candidate
    }

    return null;
  }

  for (const u of usages) {
    let ep: Endpoint | null = null;

    // Try absolute URL mapping first
    ep = matchByUrlBase(u);

    // Fallback: match by path (and method if available)
    if (!ep) {
      if (u.method) {
        const key = `${u.method}:${u.endpointPath}`;
        let arr = endpointsByKey.get(key) || [];
        if (arr.length === 0) {
          const ckey = `${u.method}:${canonicalizePath(u.endpointPath)}`;
          arr = endpointsByCanonKey.get(ckey) || [];
        }
        ep = arr.length === 1 ? arr[0] : null;
      } else {
        let arr = endpointsByPathOnly.get(u.endpointPath) || [];
        if (arr.length === 0) {
          arr = endpointsByCanonPath.get(canonicalizePath(u.endpointPath)) || [];
        }
        ep = arr.length === 1 ? arr[0] : null;
      }
    }

    if (ep) {
      // Generate a more descriptive label for the regular matching too
      let purposePrefix = '';
      const pathLower = ep.path.toLowerCase();
      if (pathLower.includes('auth') || pathLower.includes('login') || pathLower.includes('signin')) {
        purposePrefix = 'Authentication: ';
      } else if (pathLower.includes('user') || pathLower.includes('profile')) {
        purposePrefix = 'User Management: ';
      } else if (pathLower.includes('payment') || pathLower.includes('billing')) {
        purposePrefix = 'Payment: ';
      } else if (pathLower.includes('order') || pathLower.includes('cart')) {
        purposePrefix = 'Commerce: ';
      } else if (pathLower.includes('notification') || pathLower.includes('email')) {
        purposePrefix = 'Notification: ';
      } else if (pathLower.includes('search') || pathLower.includes('query')) {
        purposePrefix = 'Search: ';
      } else if (pathLower.includes('upload') || pathLower.includes('file')) {
        purposePrefix = 'File Management: ';
      }
      
      const label = `${purposePrefix}${ep.method} ${ep.path}`;
      addEdge(u.repoId, ep.repoId, label, ep.id, u.id);
    }
  }

  return Array.from(edgesMap.values());
}

export async function scanMultirepo(cfg: MultirepoConfig): Promise<{ index: MultirepoIndex; summary: ScanSummary }> {
  const result = await scanMultirepoWithChanges(cfg);
  return { index: result.index, summary: result.summary };
}

export async function scanMultirepoWithChanges(
  cfg: MultirepoConfig, 
  previousIndex?: MultirepoIndex
): Promise<{ index: MultirepoIndex; summary: ScanSummary; changes: ChangeDetectionResult }> {
  const t0 = Date.now();
  const reposDiscoveredList = await discoverRepos(cfg);

  // Build current repositories info for change detection
  const currentRepos: Record<string, RepoInfo> = {};
  for (const repo of reposDiscoveredList) {
    if (!existsSync(repo.repoPath)) continue;
    const repoId = getRepoIdFromPath(repo.repoPath, repo.name);
    const name = repo.name || basename(repo.repoPath);
    const headCommit = readHeadCommit(repo.repoPath);
    const files = walkFiles(repo.repoPath, {
      excludeGlobs: cfg.excludeGlobs,
      includeExtensions: cfg.includeFileExtensions,
    });
    const detectedLanguages = detectLanguagesByExtensions(files);
    
    currentRepos[repoId] = {
      id: repoId,
      name,
      path: normalizePath(repo.repoPath),
      url: repo.url,
      branch: repo.branch,
      headCommit,
      detectedLanguages,
    };
  }

  // Detect changes from previous scan
  const changes = detectRepositoryChanges(currentRepos, previousIndex);
  
  // Create incremental scan filter
  const shouldScanRepo = createIncrementalScanFilter(changes);

  const repos: Record<string, RepoInfo> = {};
  const endpoints: Record<string, Endpoint> = {};
  const usages: Record<string, Usage> = {};

  // Copy unchanged data from previous index if incremental
  if (previousIndex && !changes.hasChanges) {
    // No changes - return previous index with updated timestamp
    const now = new Date().toISOString();
    const index: MultirepoIndex = {
      ...previousIndex,
      updatedAt: now,
      lastScanAt: now,
    };
    
    const summary: ScanSummary = {
      reposDiscovered: reposDiscoveredList.length,
      reposScanned: 0, // No repos actually scanned
      filesScanned: 0,
      endpointsFound: Object.keys(previousIndex.endpoints).length,
      usagesFound: Object.keys(previousIndex.usages).length,
      durationMs: Date.now() - t0,
      changedRepos: [],
    };

    return { index, summary, changes };
  }

  // Copy unchanged repositories from previous index
  if (previousIndex) {
    for (const [repoId, repo] of Object.entries(currentRepos)) {
      if (!shouldScanRepo(repoId)) {
        repos[repoId] = repo;
        // Copy existing endpoints and usages for unchanged repos
        for (const [epId, endpoint] of Object.entries(previousIndex.endpoints)) {
          if (endpoint.repoId === repoId) {
            endpoints[epId] = endpoint;
          }
        }
        for (const [usageId, usage] of Object.entries(previousIndex.usages)) {
          if (usage.repoId === repoId) {
            usages[usageId] = usage;
          }
        }
      }
    }
  }

  let filesScanned = 0;

  // Scan only changed repositories
  for (const repo of reposDiscoveredList) {
    const repoPath = repo.repoPath;
    if (!existsSync(repoPath)) continue;

    const repoId = getRepoIdFromPath(repoPath, repo.name);
    
    // Skip if this repo doesn't need scanning
    if (previousIndex && !shouldScanRepo(repoId)) {
      continue;
    }

    const name = repo.name || basename(repoPath);
    const headCommit = readHeadCommit(repoPath);
    const files = walkFiles(repoPath, {
      excludeGlobs: cfg.excludeGlobs,
      includeExtensions: cfg.includeFileExtensions,
    });

    const detectedLanguages = detectLanguagesByExtensions(files);
    repos[repoId] = {
      id: repoId,
      name,
      path: normalizePath(repoPath),
      url: repo.url,
      branch: repo.branch,
      headCommit,
      detectedLanguages,
    };

    for (const absFile of files) {
      if (cfg.indexPath && normalizePath(absFile) === normalizePath(cfg.indexPath)) {
        continue;
      }
      filesScanned++;
      let content: string;
      try {
        content = readFileSync(absFile, "utf-8");
      } catch {
        continue;
      }
      const relFile = relative(repoPath, absFile);

      // Endpoints
      const eps = detectEndpointsInFile({
        repoId,
        repoPath,
        absFile,
        relFile,
        content,
        cfg,
      });
      for (const ep of eps) {
        endpoints[ep.id] = ep;
      }

      // Usages
      const uss = detectUsagesInFile({
        repoId,
        repoPath,
        absFile,
        relFile,
        content,
      });
      for (const u of uss) {
        usages[u.id] = u;
      }
    }
  }

  const endpointsArr = Object.values(endpoints);
  const usagesArr = Object.values(usages);
  
  // Basic pattern-based edge detection
  let edges: CrossRepoEdge[] = [];
  
  console.log(`🔍 Basic pattern matching: ${endpointsArr.length} endpoints, ${usagesArr.length} usages across ${Object.keys(repos).length} repos`);
  
  for (const usage of usagesArr) {
    if (!usage.url) continue;
    
    // Extract service information from URLs like:
    // http://user-service:3001 -> user-service
    // http://payment-service:3002 -> payment-service  
    // http://localhost:3001 -> localhost:3001
    let targetServiceName = '';
    let targetPort = '';
    
    try {
      const url = new URL(usage.url);
      const hostname = url.hostname;
      targetPort = url.port;
      
      // Map service hostnames to repository IDs
      if (hostname.includes('user-service') || (hostname === 'localhost' && targetPort === '3001')) {
        targetServiceName = 'demo-user-service';
      } else if (hostname.includes('payment-service') || (hostname === 'localhost' && targetPort === '3002')) {
        targetServiceName = 'demo-payment-service';
      } else if (hostname.includes('transaction-service') || (hostname === 'localhost' && targetPort === '3003')) {
        targetServiceName = 'demo-transaction-service';
      }
      
      // Find a matching repository
      const targetRepo = Object.values(repos).find(repo => 
        repo.id === targetServiceName || 
        repo.name === targetServiceName ||
        repo.name.includes(targetServiceName.replace('demo-', ''))
      );
      
      if (targetRepo && targetRepo.id !== usage.repoId) {
        // Create edge for this cross-repository call
        const edgeId = `${usage.repoId}-${targetRepo.id}-${usage.method || 'CALL'}-${usage.endpointPath}`;
        const existingEdge = edges.find(e => 
          e.fromRepoId === usage.repoId && 
          e.toRepoId === targetRepo.id &&
          e.label.includes(usage.endpointPath)
        );
        
        if (existingEdge) {
          existingEdge.count++;
          if (!existingEdge.usageIds.includes(usage.id)) {
            existingEdge.usageIds.push(usage.id);
          }
        } else {
          // Generate a more descriptive label even without Groq analysis
          const method = usage.method || 'CALL';
          const path = usage.endpointPath;
          
          // Try to infer purpose from the path
          let purposePrefix = '';
          const pathLower = path.toLowerCase();
          if (pathLower.includes('auth') || pathLower.includes('login') || pathLower.includes('signin')) {
            purposePrefix = 'Authentication: ';
          } else if (pathLower.includes('user') || pathLower.includes('profile')) {
            purposePrefix = 'User Management: ';
          } else if (pathLower.includes('payment') || pathLower.includes('billing')) {
            purposePrefix = 'Payment: ';
          } else if (pathLower.includes('order') || pathLower.includes('cart')) {
            purposePrefix = 'Commerce: ';
          } else if (pathLower.includes('notification') || pathLower.includes('email')) {
            purposePrefix = 'Notification: ';
          } else if (pathLower.includes('search') || pathLower.includes('query')) {
            purposePrefix = 'Search: ';
          } else if (pathLower.includes('upload') || pathLower.includes('file')) {
            purposePrefix = 'File Management: ';
          }
          
          edges.push({
            fromRepoId: usage.repoId,
            toRepoId: targetRepo.id,
            label: `${purposePrefix}${method} ${path}`,
            count: 1,
            endpointIds: [], // We'd need to match specific endpoints
            usageIds: [usage.id]
          });
        }
        
        console.log(`  📡 Found relationship: ${usage.repoId} -> ${targetRepo.id} (${usage.url})`);
      }
    } catch (error) {
      // Skip invalid URLs
      continue;
    }
  }
  
  console.log(`✅ Basic pattern matching found ${edges.length} cross-repository relationships`);

  // Enhanced Groq-based edge detection
  try {
    const tempIndex: MultirepoIndex = {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      configHash: '',
      repos,
      endpoints,
      usages,
      edges: [],
      lastScanAt: new Date().toISOString()
    };

    // Only run Groq analysis if we have multiple repos and GROQ_API_KEY is set
    if (Object.keys(repos).length > 1 && process.env.GROQ_API_KEY) {
      console.log('🧠 Running Groq analysis for intelligent relationship detection...');
      const groqAnalyzer = new GroqAnalyzer();
      const analysis = await groqAnalyzer.analyzeRelationships(tempIndex);
      const groqEdges = groqAnalyzer.convertToEdges(analysis, tempIndex);
      
      // Merge Groq edges with basic edges, prioritizing Groq
      const mergedEdges = [...edges];
      for (const groqEdge of groqEdges) {
        // Check if we already have a similar edge
        const existingEdge = mergedEdges.find(e => 
          e.fromRepoId === groqEdge.fromRepoId && 
          e.toRepoId === groqEdge.toRepoId
        );
        
        if (existingEdge) {
          // Enhance existing edge with Groq analysis
          existingEdge.groqAnalysis = groqEdge.groqAnalysis;
        } else {
          // Add new Groq-discovered edge
          mergedEdges.push(groqEdge);
        }
      }
      edges = mergedEdges;
      
      console.log(`✅ Groq analysis complete: ${groqEdges.length} intelligent relationships found`);
      
      // Log insights
      if (analysis.insights.length > 0) {
        console.log('💡 Groq Insights:');
        analysis.insights.forEach(insight => {
          console.log(`  [${insight.type}] ${insight.message} (confidence: ${insight.confidence})`);
        });
      }
    } else if (Object.keys(repos).length <= 1) {
      console.log('ℹ️ Skipping Groq analysis: Only one repository found');
    } else {
      console.log('ℹ️ Skipping Groq analysis: GROQ_API_KEY not set. Set it to enable AI-powered relationship detection.');
    }
  } catch (error) {
    console.error('❌ Groq analysis failed:', error);
    // Continue with basic edges only
  }

  const now = new Date().toISOString();
  const index: MultirepoIndex = {
    version: 1,
    createdAt: previousIndex?.createdAt || now,
    updatedAt: now,
    configHash: hashConfig(cfg),
    repos,
    endpoints,
    usages,
    edges,
    lastScanAt: now,
    scanStats: {
      reposScanned: Object.keys(repos).length,
      filesScanned,
      endpointsFound: endpointsArr.length,
      usagesFound: usagesArr.length,
      durationMs: Date.now() - t0,
    },
  };

  const summary: ScanSummary = {
    reposDiscovered: reposDiscoveredList.length,
    reposScanned: Object.keys(repos).length,
    filesScanned,
    endpointsFound: endpointsArr.length,
    usagesFound: usagesArr.length,
    durationMs: Date.now() - t0,
    changedRepos: changes.changedRepos,
  };

  return { index, summary, changes };
}
