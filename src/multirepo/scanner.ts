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
    if (/^\{[^}]+\}$/.test(seg)) return ":";
    if (/^:/.test(seg)) return ":";
    if (/^\$\{[^}]+\}$/.test(seg)) return ":";
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

  // Generic server object call: <obj>.<method>('/path', ...)
  // Matches Express/Router/Fastify and also FastAPI decorators like @app.get('/path')
  const genericCallRe =
    /\b([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|delete|patch|options|head|all)\s*\(\s*(['"`])([^"'`]+)\3/g;
  for (let m; (m = genericCallRe.exec(content)); ) {
    const obj = m[1];
    const method = toHttpMethod(m[2])!;
    const path = ensureLeadingSlash(m[4]);
    const line = getLineNumber(content, m.index);
    const key = `${method}|${path}|${line}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // best-effort framework hint
    let framework: string = "unknown";
    if (obj === "fastify") framework = "fastify";
    else if (obj === "router" || obj === "app") framework = "express";

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

  // fetch(url, { method: '...' })
  const fetchRe = /\bfetch\s*\(\s*(['"`])([^"'`]+)\1\s*(,\s*\{[^)]*\))?/g;
  for (let m; (m = fetchRe.exec(content)); ) {
    const urlOrPath = m[2];
    const opts = m[3] || "";
    let method: HttpMethod | undefined;
    const methodRe = /method\s*:\s*(['"`])([A-Za-z]+)\1/i;
    const mm = methodRe.exec(opts);
    if (mm) method = toHttpMethod(mm[2]);

    const line = getLineNumber(content, m.index);
    const snippet = getLineSnippet(content, m.index);
    const { endpointPath, absoluteUrl } = splitUrl(urlOrPath);
    const id = sha1(`${repoId}|fetch|${endpointPath}|${relFile}|${line}|${method || "UNK"}`);
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
      tool: "fetch",
    });
  }

  // axios.method(url)
  const axiosMethodRe =
    /\baxios\.(get|post|put|delete|patch|options|head|all)\s*\(\s*(['"`])([^"'`]+)\2/g;
  for (let m; (m = axiosMethodRe.exec(content)); ) {
    const method = toHttpMethod(m[1])!;
    const urlOrPath = m[3];
    const line = getLineNumber(content, m.index);
    const snippet = getLineSnippet(content, m.index);
    const { endpointPath, absoluteUrl } = splitUrl(urlOrPath);
    const id = sha1(`${repoId}|axiosm|${endpointPath}|${relFile}|${line}|${method}`);
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
      tool: "axios",
    });
  }

  // axios(url, { method: '...' })
  const axiosRe = /\baxios\s*\(\s*(['"`])([^"'`]+)\1\s*(,\s*\{[^)]*\))?/g;
  for (let m; (m = axiosRe.exec(content)); ) {
    const urlOrPath = m[2];
    const opts = m[3] || "";
    let method: HttpMethod | undefined;
    const methodRe = /method\s*:\s*(['"`])([A-Za-z]+)\1/i;
    const mm = methodRe.exec(opts);
    if (mm) method = toHttpMethod(mm[2]);

    const line = getLineNumber(content, m.index);
    const snippet = getLineSnippet(content, m.index);
    const { endpointPath, absoluteUrl } = splitUrl(urlOrPath);
    const id = sha1(`${repoId}|axios|${endpointPath}|${relFile}|${line}|${method || "UNK"}`);
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
      tool: "axios",
    });
  }

  // http(s).request(url)
  const httpReqRe = /\bhttps?\s*\.\s*request\s*\(\s*(['"`])([^"'`]+)\1/g;
  for (let m; (m = httpReqRe.exec(content)); ) {
    const urlOrPath = m[2];
    const line = getLineNumber(content, m.index);
    const snippet = getLineSnippet(content, m.index);
    const { endpointPath, absoluteUrl } = splitUrl(urlOrPath);
    const id = sha1(`${repoId}|http|${endpointPath}|${relFile}|${line}`);
    usages.push({
      id,
      repoId,
      file: normalizePath(absFile),
      relFile: relFile.replace(/\\/g, "/"),
      line,
      method: undefined,
      endpointPath,
      url: absoluteUrl || undefined,
      snippet,
      tool: "http",
    });
  }

  // Python requests.<method>(url)
  const requestsRe =
    /\brequests\.(get|post|put|delete|patch|options|head)\s*\(\s*(['"])([^'"]+)\2/g;
  for (let m; (m = requestsRe.exec(content)); ) {
    const method = toHttpMethod(m[1])!;
    const urlOrPath = m[3];
    const line = getLineNumber(content, m.index);
    const snippet = getLineSnippet(content, m.index);
    const { endpointPath, absoluteUrl } = splitUrl(urlOrPath);
    const id = sha1(`${repoId}|requests|${endpointPath}|${relFile}|${line}|${method}`);
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
      tool: "requests",
    });
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

function discoverRepos(cfg: MultirepoConfig): { repoPath: string; name?: string; branch?: string; url?: string }[] {
  const set = new Map<string, { repoPath: string; name?: string; branch?: string; url?: string }>();

  // Explicit repos (local paths only for MVP)
  if (cfg.repos && cfg.repos.length > 0) {
    for (const r of cfg.repos) {
      if (!r.path) continue;
      const abs = normalizePath(resolve(r.path));
      set.set(abs, { repoPath: abs, name: r.name, branch: r.branch, url: r.url });
    }
  }

  if (set.size > 0) {
    return Array.from(set.values());
  }

  // Discover from roots
  const roots = cfg.roots && cfg.roots.length > 0 ? cfg.roots : [process.cwd()];
  const discovered = findGitRepos(roots.map((r) => resolve(r)), cfg.excludeGlobs);
  for (const p of discovered) {
    const abs = normalizePath(resolve(p));
    if (!set.has(abs)) set.set(abs, { repoPath: abs });
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
    for (const base of cfg.urlBases) {
      if (u.url && u.url.startsWith(base.baseUrl)) {
        const after = ensureLeadingSlash(u.url.slice(base.baseUrl.length).split("?")[0] || u.endpointPath);
        candidates.push({ base, pathAfterBase: after });
      } else if (u.endpointPath && u.endpointPath.startsWith(base.baseUrl)) {
        const after = ensureLeadingSlash(u.endpointPath.slice(base.baseUrl.length).split("?")[0] || "/");
        candidates.push({ base, pathAfterBase: after });
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
      const label = `${ep.method} ${ep.path}`;
      addEdge(u.repoId, ep.repoId, label, ep.id, u.id);
    }
  }

  return Array.from(edgesMap.values());
}

export function scanMultirepo(cfg: MultirepoConfig): { index: MultirepoIndex; summary: ScanSummary } {
  const t0 = Date.now();
  const reposDiscoveredList = discoverRepos(cfg);

  const repos: Record<string, RepoInfo> = {};
  const endpoints: Record<string, Endpoint> = {};
  const usages: Record<string, Usage> = {};

  let filesScanned = 0;

  for (const repo of reposDiscoveredList) {
    const repoPath = repo.repoPath;
    if (!existsSync(repoPath)) continue;

    const repoId = getRepoIdFromPath(repoPath, repo.name);
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
  const edges = mapUsagesToEndpoints({
    endpoints: endpointsArr,
    usages: usagesArr,
    cfg,
    reposById: repos,
  });

  const now = new Date().toISOString();
  const index: MultirepoIndex = {
    version: 1,
    createdAt: now,
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
    changedRepos: Object.keys(repos), // placeholder; MVP no change detection
  };

  return { index, summary };
}
