import { existsSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { readHeadCommit } from "./git.js";
import { MultirepoIndex, RepoInfo } from "../types.js";
import { normalizePath } from "./utils.js";

export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedRepos: string[];
  newRepos: string[];
  deletedRepos: string[];
  changeDetails: RepoChangeDetail[];
}

export interface RepoChangeDetail {
  repoId: string;
  changeType: 'modified' | 'new' | 'deleted';
  oldCommit?: string;
  newCommit?: string;
  modifiedFiles?: string[];
  lastModified?: Date;
}

export interface WatchConfig {
  enabled: boolean;
  pollIntervalMs: number;
  gitCommitTracking: boolean;
  fileSystemTracking: boolean;
  excludePatterns?: string[];
}

/**
 * Detect changes in repositories since last scan
 */
export function detectRepositoryChanges(
  currentRepos: Record<string, RepoInfo>,
  previousIndex?: MultirepoIndex
): ChangeDetectionResult {
  const result: ChangeDetectionResult = {
    hasChanges: false,
    changedRepos: [],
    newRepos: [],
    deletedRepos: [],
    changeDetails: []
  };

  if (!previousIndex) {
    // First scan - all repos are new
    result.hasChanges = true;
    result.newRepos = Object.keys(currentRepos);
    result.changeDetails = Object.keys(currentRepos).map(repoId => ({
      repoId,
      changeType: 'new' as const,
      newCommit: currentRepos[repoId].headCommit || undefined
    }));
    return result;
  }

  const previousRepos = previousIndex.repos;
  const currentRepoIds = new Set(Object.keys(currentRepos));
  const previousRepoIds = new Set(Object.keys(previousRepos));

  // Detect new repositories
  for (const repoId of currentRepoIds) {
    if (!previousRepoIds.has(repoId)) {
      result.newRepos.push(repoId);
      result.changeDetails.push({
        repoId,
        changeType: 'new',
        newCommit: currentRepos[repoId].headCommit || undefined
      });
    }
  }

  // Detect deleted repositories
  for (const repoId of previousRepoIds) {
    if (!currentRepoIds.has(repoId)) {
      result.deletedRepos.push(repoId);
      result.changeDetails.push({
        repoId,
        changeType: 'deleted',
        oldCommit: previousRepos[repoId].headCommit || undefined
      });
    }
  }

  // Detect modified repositories
  for (const repoId of currentRepoIds) {
    if (previousRepoIds.has(repoId)) {
      const currentRepo = currentRepos[repoId];
      const previousRepo = previousRepos[repoId];
      
      const hasCommitChange = currentRepo.headCommit !== previousRepo.headCommit;
      const hasPathChange = currentRepo.path !== previousRepo.path;
      
      if (hasCommitChange || hasPathChange) {
        result.changedRepos.push(repoId);
        result.changeDetails.push({
          repoId,
          changeType: 'modified',
          oldCommit: previousRepo.headCommit || undefined,
          newCommit: currentRepo.headCommit || undefined
        });
      }
    }
  }

  result.hasChanges = result.newRepos.length > 0 || 
                     result.deletedRepos.length > 0 || 
                     result.changedRepos.length > 0;

  return result;
}

/**
 * Get detailed file changes for a repository
 */
export function getRepositoryFileChanges(
  repoPath: string,
  oldCommit?: string,
  newCommit?: string
): string[] {
  if (!oldCommit || !newCommit || oldCommit === newCommit) {
    return [];
  }

  try {
    // This is a simplified implementation
    // In a full implementation, you'd use git diff to get actual changed files
    const gitDir = join(repoPath, '.git');
    if (!existsSync(gitDir)) {
      return [];
    }

    // For MVP, we'll return an empty array
    // A full implementation would run: git diff --name-only <oldCommit> <newCommit>
    return [];
  } catch {
    return [];
  }
}

/**
 * File system watcher for real-time change detection
 */
export class RepositoryWatcher {
  private watchers: Map<string, any> = new Map();
  private config: WatchConfig;
  private changeCallbacks: ((changes: ChangeDetectionResult) => void)[] = [];

  constructor(config: WatchConfig = {
    enabled: false,
    pollIntervalMs: 30000, // 30 seconds
    gitCommitTracking: true,
    fileSystemTracking: false
  }) {
    this.config = config;
  }

  /**
   * Start watching repositories for changes
   */
  startWatching(repos: Record<string, RepoInfo>): void {
    if (!this.config.enabled) {
      return;
    }

    this.stopWatching(); // Clean up existing watchers

    for (const [repoId, repo] of Object.entries(repos)) {
      this.watchRepository(repoId, repo);
    }

    // Start polling for git commit changes
    if (this.config.gitCommitTracking) {
      this.startGitPolling(repos);
    }
  }

  /**
   * Stop all watchers
   */
  stopWatching(): void {
    for (const watcher of this.watchers.values()) {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    }
    this.watchers.clear();
  }

  /**
   * Add callback for change notifications
   */
  onChanges(callback: (changes: ChangeDetectionResult) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Remove change callback
   */
  removeChangeCallback(callback: (changes: ChangeDetectionResult) => void): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  private watchRepository(repoId: string, repo: RepoInfo): void {
    if (!existsSync(repo.path)) {
      return;
    }

    try {
      if (this.config.fileSystemTracking) {
        // File system watching is complex and can be resource intensive
        // For MVP, we'll rely on git commit polling instead
        // const watcher = fs.watch(repo.path, { recursive: true }, (eventType, filename) => {
        //   this.handleFileChange(repoId, repo, eventType, filename);
        // });
        // this.watchers.set(repoId, watcher);
      }
    } catch (error) {
      console.warn(`Failed to watch repository ${repoId}:`, error);
    }
  }

  private startGitPolling(repos: Record<string, RepoInfo>): void {
    let lastCommits = new Map<string, string>();
    
    // Initialize last known commits
    for (const [repoId, repo] of Object.entries(repos)) {
      const commit = readHeadCommit(repo.path);
      if (commit) {
        lastCommits.set(repoId, commit);
      }
    }

    const pollInterval = setInterval(() => {
      const changes: RepoChangeDetail[] = [];

      for (const [repoId, repo] of Object.entries(repos)) {
        const currentCommit = readHeadCommit(repo.path);
        const lastCommit = lastCommits.get(repoId);

        if (currentCommit && currentCommit !== lastCommit) {
          changes.push({
            repoId,
            changeType: 'modified',
            oldCommit: lastCommit,
            newCommit: currentCommit
          });
          lastCommits.set(repoId, currentCommit);
        }
      }

      if (changes.length > 0) {
        const changeResult: ChangeDetectionResult = {
          hasChanges: true,
          changedRepos: changes.map(c => c.repoId),
          newRepos: [],
          deletedRepos: [],
          changeDetails: changes
        };

        this.notifyChanges(changeResult);
      }
    }, this.config.pollIntervalMs);

    this.watchers.set('git-poller', { 
      close: () => clearInterval(pollInterval) 
    });
  }

  private notifyChanges(changes: ChangeDetectionResult): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(changes);
      } catch (error) {
        console.warn('Error in change callback:', error);
      }
    }
  }
}

/**
 * Incremental scanner that only processes changed repositories
 */
export function createIncrementalScanFilter(
  changes: ChangeDetectionResult
): (repoId: string) => boolean {
  if (!changes.hasChanges) {
    return () => false; // Skip all repos if no changes
  }

  const affectedRepos = new Set([
    ...changes.newRepos,
    ...changes.changedRepos
  ]);

  return (repoId: string) => affectedRepos.has(repoId);
}

/**
 * Smart change detection configuration for different environments
 */
export const CHANGE_DETECTION_PRESETS = {
  development: {
    enabled: true,
    pollIntervalMs: 10000, // 10 seconds - fast for development
    gitCommitTracking: true,
    fileSystemTracking: false // Too noisy for development
  },
  
  ci: {
    enabled: false, // CI typically runs once
    pollIntervalMs: 0,
    gitCommitTracking: false,
    fileSystemTracking: false
  },
  
  production: {
    enabled: true,
    pollIntervalMs: 300000, // 5 minutes - slower for production
    gitCommitTracking: true,
    fileSystemTracking: false,
    excludePatterns: [
      '**/node_modules/**',
      '**/.git/**',
      '**/logs/**',
      '**/tmp/**'
    ]
  }
};
