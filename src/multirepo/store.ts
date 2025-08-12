import { existsSync, readFileSync, writeFileSync } from "fs";
import { MultirepoIndex } from "../types.js";

export function loadIndex(indexPath: string): MultirepoIndex | null {
  try {
    if (!existsSync(indexPath)) return null;
    const text = readFileSync(indexPath, "utf-8");
    const parsed = JSON.parse(text) as MultirepoIndex;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIndex(indexPath: string, index: MultirepoIndex): void {
  const payload = JSON.stringify(index, null, 2);
  writeFileSync(indexPath, payload, "utf-8");
}
