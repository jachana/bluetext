// Package.json parser for extracting repository dependencies
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Parse package.json dependencies and filter for known repositories
 * @param repoPath Absolute path to the repository
 * @param allRepoNames Array of all known repository names from config
 * @param includeDevDeps Whether to include devDependencies
 * @returns Array of dependency repository names
 */
export function parseRepoDependencies(
  repoPath: string,
  allRepoNames: string[],
  includeDevDeps: boolean = false
): string[] {
  const packageJsonPath = join(repoPath, 'package.json');
  
  // Read package.json file
  const packageJson = readPackageJson(packageJsonPath);
  if (!packageJson) {
    return []; // No package.json found, return empty dependencies
  }
  
  // Extract all dependencies
  const dependencies = extractDependencies(packageJson, includeDevDeps);
  
  // Filter to only include known repositories
  return filterRepoDependencies(dependencies, allRepoNames);
}

/**
 * Read and parse package.json file
 * @param packageJsonPath Path to package.json file
 * @returns Parsed package.json object or null if not found
 */
function readPackageJson(packageJsonPath: string): any | null {
  try {
    if (!existsSync(packageJsonPath)) {
      return null;
    }
    
    const content = readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to read package.json at ${packageJsonPath}:`, error);
    return null;
  }
}

/**
 * Extract dependencies from package.json object
 * @param packageJson Parsed package.json object
 * @param includeDevDeps Whether to include devDependencies
 * @returns Array of dependency names
 */
function extractDependencies(packageJson: any, includeDevDeps: boolean): string[] {
  const dependencies: string[] = [];
  
  // Extract regular dependencies
  if (packageJson.dependencies && typeof packageJson.dependencies === 'object') {
    dependencies.push(...Object.keys(packageJson.dependencies));
  }
  
  // Extract devDependencies if requested
  if (includeDevDeps && packageJson.devDependencies && typeof packageJson.devDependencies === 'object') {
    dependencies.push(...Object.keys(packageJson.devDependencies));
  }
  
  return dependencies;
}

/**
 * Filter dependencies to only include known repositories
 * @param dependencies Array of all dependencies
 * @param knownRepos Array of known repository names
 * @returns Array of repository dependencies
 */
function filterRepoDependencies(dependencies: string[], knownRepos: string[]): string[] {
  return dependencies.filter(dep => knownRepos.includes(dep));
}
