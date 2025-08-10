import { existsSync, readFileSync } from "fs";
import { basename, join, resolve } from "path";

export function getRepoIdFromPath(repoPath: string, preferredName?: string): string {
  const name = preferredName?.trim() || basename(resolve(repoPath));
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
}

export function readHeadCommit(repoPath: string): string | null {
  try {
    const gitDir = join(repoPath, ".git");
    if (!existsSync(gitDir)) return null;

    const headPath = join(gitDir, "HEAD");
    if (!existsSync(headPath)) return null;

    const head = readFileSync(headPath, "utf-8").trim();
    // HEAD can be 'ref: refs/heads/main' or a detached commit hash
    if (head.startsWith("ref:")) {
      const ref = head.replace("ref:", "").trim();
      const refPath = join(gitDir, ref);
      if (existsSync(refPath)) {
        const sha = readFileSync(refPath, "utf-8").trim();
        return sha || null;
      }
      return null;
    }
    // Detached HEAD
    if (/^[0-9a-fA-F]{7,40}$/.test(head)) {
      return head;
    }
    return null;
  } catch {
    return null;
  }
}

export function detectLanguagesByExtensions(files: string[]): string[] {
  const langs = new Set<string>();
  for (const f of files) {
    const lower = f.toLowerCase();
    if (lower.endsWith(".ts") || lower.endsWith(".tsx")) langs.add("TypeScript");
    else if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs"))
      langs.add("JavaScript");
    else if (lower.endsWith(".py")) langs.add("Python");
    else if (lower.endsWith(".java")) langs.add("Java");
    else if (lower.endsWith(".go")) langs.add("Go");
    else if (lower.endsWith(".rb")) langs.add("Ruby");
    else if (lower.endsWith(".cs")) langs.add("C#");
    else if (lower.endsWith(".php")) langs.add("PHP");
    else if (lower.endsWith(".json")) langs.add("JSON");
    else if (lower.endsWith(".yaml") || lower.endsWith(".yml")) langs.add("YAML");
  }
  return Array.from(langs);
}
