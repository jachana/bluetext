import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, isAbsolute, dirname } from "path";
import crypto from "crypto";
import { MultirepoConfig } from "../types.js";

const DEFAULT_CONFIG_FILE = "multirepo.config.json";

export function getConfigPath(): string {
  const envPath = process.env.BLUETEXT_MULTIREPO_CONFIG;
  if (envPath && envPath.trim().length > 0) {
    return isAbsolute(envPath) ? envPath : resolve(process.cwd(), envPath);
  }
  return resolve(process.cwd(), DEFAULT_CONFIG_FILE);
}

export function loadConfig(): MultirepoConfig {
  const cfgPath = getConfigPath();
  if (!existsSync(cfgPath)) {
    // Return sensible defaults if no config present
    return {
      roots: [process.cwd()],
      excludeGlobs: [],
      includeFileExtensions: [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs",
        ".py",
        ".json",
        ".yaml",
        ".yml"
      ],
      indexPath: resolve(process.cwd(), "multirepo-index.json"),
    };
  }
const text = readFileSync(cfgPath, "utf-8");
const parsed = JSON.parse(text) as MultirepoConfig;
const baseDir = dirname(cfgPath);
  // Fill defaults
if (!parsed.roots || parsed.roots.length === 0) parsed.roots = [baseDir];
  if (!parsed.includeFileExtensions) {
    parsed.includeFileExtensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".py",
      ".json",
      ".yaml",
      ".yml",
    ];
  }
if (!parsed.indexPath) {
    parsed.indexPath = resolve(baseDir, "multirepo-index.json");
  } else if (!isAbsolute(parsed.indexPath)) {
    parsed.indexPath = resolve(baseDir, parsed.indexPath);
  }
  // Normalize roots to absolute
parsed.roots = parsed.roots.map((r) => (isAbsolute(r) ? r : resolve(baseDir, r)));
  // Normalize repo paths if provided
if (parsed.repos) {
    parsed.repos = parsed.repos.map((r) => ({
      ...r,
      path: r.path ? (isAbsolute(r.path) ? r.path : resolve(baseDir, r.path)) : r.path,
    }));
  }
  return parsed;
}

export function saveConfig(cfg: MultirepoConfig): void {
  const cfgPath = getConfigPath();
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), "utf-8");
}

export function hashConfig(cfg: MultirepoConfig): string {
  const normalized = {
    ...cfg,
    // Do not include non-deterministic data
  };
  const s = JSON.stringify(normalized);
  return crypto.createHash("sha1").update(s).digest("hex");
}
