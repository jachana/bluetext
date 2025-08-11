// Configuration loader for the Multirepo MCP Server
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';
import { RepoConfig, RepoRef } from './types.js';

/**
 * Load and validate configuration from YAML file
 * @param configPath Path to the config.yml file
 * @returns Validated RepoConfig with absolute paths
 */
export function loadConfig(configPath: string): RepoConfig {
  try {
    // Read and parse YAML file
    const configContent = readFileSync(configPath, 'utf8');
    const rawConfig = yaml.load(configContent);
    
    // Validate configuration structure
    const validatedConfig = validateConfig(rawConfig);
    
    // Resolve relative paths to absolute paths
    const configDir = resolve(configPath, '..');
    validatedConfig.repos = resolveRepoPaths(validatedConfig.repos, configDir);
    
    return validatedConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load configuration from ${configPath}: ${error.message}`);
    }
    throw new Error(`Failed to load configuration from ${configPath}: Unknown error`);
  }
}

/**
 * Validate configuration structure and required fields
 * @param config Raw configuration object
 * @returns Validated RepoConfig
 */
function validateConfig(config: any): RepoConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }

  if (!config.repos || !Array.isArray(config.repos)) {
    throw new Error('Configuration must have a "repos" array');
  }

  if (config.repos.length === 0) {
    throw new Error('At least one repository must be configured');
  }

  // Validate each repository reference
  for (let i = 0; i < config.repos.length; i++) {
    const repo = config.repos[i];
    
    if (!repo || typeof repo !== 'object') {
      throw new Error(`Repository at index ${i} must be an object`);
    }

    if (!repo.name || typeof repo.name !== 'string') {
      throw new Error(`Repository at index ${i} must have a "name" string`);
    }

    if (!repo.path || typeof repo.path !== 'string') {
      throw new Error(`Repository at index ${i} must have a "path" string`);
    }

    // Check for duplicate names
    const duplicateIndex = config.repos.findIndex((r: any, idx: number) => 
      idx !== i && r.name === repo.name
    );
    if (duplicateIndex !== -1) {
      throw new Error(`Duplicate repository name "${repo.name}" found at indices ${i} and ${duplicateIndex}`);
    }
  }

  // Validate options if present
  if (config.options && typeof config.options !== 'object') {
    throw new Error('Configuration "options" must be an object');
  }

  return {
    repos: config.repos,
    options: config.options || {}
  };
}

/**
 * Resolve relative paths to absolute paths
 * @param repoRefs Array of repository references
 * @param configDir Directory containing the config file
 * @returns Repository references with absolute paths
 */
function resolveRepoPaths(repoRefs: RepoRef[], configDir: string): RepoRef[] {
  return repoRefs.map(repo => ({
    ...repo,
    path: resolve(configDir, repo.path)
  }));
}
