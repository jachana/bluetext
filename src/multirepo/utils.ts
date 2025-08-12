import { readdirSync, statSync } from "fs";
import { join, resolve, isAbsolute } from "path";

/**
 * Very small glob-to-regex converter supporting:
 * - *  => matches any chars except path separator
 * - ** => matches any chars including path separators
 * - ?  => matches single char
 * Patterns are treated as path-like globs.
 */
export function globToRegExp(glob: string): RegExp {
  // Normalize Windows backslashes in patterns by converting to /
  const pattern = glob.replace(/\\/g, "/");
  let regexStr = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === ".") {
      regexStr += "\\.";
    } else if (c === "+") {
      regexStr += "\\+";
    } else if (c === "(" || c === ")" || c === "{" || c === "}" || c === "|" || c === "^" || c === "$") {
      regexStr += "\\" + c;
    } else if (c === "?") {
      regexStr += "[^/]";
    } else if (c === "*") {
      // Check for **
      if (pattern[i + 1] === "*") {
        // consume the second *
        i++;
        // If followed by a slash, consume it as well
        if (pattern[i + 1] === "/") {
          i++;
        }
        regexStr += "(.+?)?"; // non-greedy any including path separators
      } else {
        regexStr += "[^/]*";
      }
    } else if (c === "/") {
      regexStr += "/";
    } else {
      regexStr += c.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
    }
    i++;
  }
  regexStr += "$";
  return new RegExp(regexStr);
}

export function anyGlobMatch(targetPath: string, globs: string[] | undefined): boolean {
  if (!globs || globs.length === 0) return false;
  const norm = normalizePath(targetPath);
  return globs.some((g) => globToRegExp(g).test(norm));
}

export function normalizePath(p: string): string {
  // Convert to absolute forward-slash form
  const abs = isAbsolute(p) ? p : resolve(p);
  return abs.replace(/\\/g, "/");
}

export function isLikelyBinary(filename: string): boolean {
  const lower = filename.toLowerCase();
  const binExts = [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".gz", ".tar", ".ico", ".woff", ".woff2"];
  return binExts.some((e) => lower.endsWith(e));
}

export interface WalkOptions {
  excludeGlobs?: string[];
  includeExtensions?: string[];
  maxFiles?: number;
}

export function walkFiles(root: string, opts: WalkOptions = {}): string[] {
  const result: string[] = [];
  const stack: string[] = [root];

  const defaultExcludes = [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.venv/**",
    "**/.idea/**",
    "**/.vscode/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/target/**",
    "**/bin/**",
    "**/obj/**",
  ];

  const excludes = [...defaultExcludes, ...(opts.excludeGlobs || [])].map(globToRegExp);

  while (stack.length > 0) {
    const dir = stack.pop()!;
    let dirents: string[];
    try {
      dirents = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of dirents) {
      const full = join(dir, name);
      const norm = normalizePath(full);
      if (excludes.some((re) => re.test(norm))) continue;

      let s;
      try {
        s = statSync(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        stack.push(full);
      } else if (s.isFile()) {
        if (opts.includeExtensions && opts.includeExtensions.length > 0) {
          const ok = opts.includeExtensions.some((ext) => norm.toLowerCase().endsWith(ext.toLowerCase()));
          if (!ok) continue;
        }
        if (isLikelyBinary(full)) continue;
        result.push(full);
        if (opts.maxFiles && result.length >= opts.maxFiles) return result;
      }
    }
  }

  return result;
}

export function findGitRepos(roots: string[], excludeGlobs?: string[], maxDepth = 5): string[] {
  const repos = new Set<string>();

  const excluded = (p: string) => anyGlobMatch(p, excludeGlobs);

  function search(dir: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    const names = new Set(entries);
    if (names.has(".git")) {
      repos.add(resolve(dir));
      return; // do not descend further in this repo
    }
    for (const name of entries) {
      const full = join(dir, name);
      if (excluded(full)) continue;
      let s;
      try {
        s = statSync(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        search(full, depth + 1);
      }
    }
  }

  for (const r of roots) {
    search(resolve(r), 0);
  }

  return Array.from(repos);
}
