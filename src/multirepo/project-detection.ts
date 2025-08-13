import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, basename, resolve } from "path";
import { normalizePath } from "./utils.js";

export interface ProjectIndicator {
  type: string;
  files?: string[];
  directories?: string[];
  weight: number; // Higher weight = stronger indicator
}

export interface ProjectInfo {
  path: string;
  name: string;
  types: string[];
  confidence: number;
  indicators: string[];
}

export interface AutoDiscoveryConfig {
  maxDepth?: number;
  minConfidence?: number;
  excludePatterns?: string[];
  includeHidden?: boolean;
}

// Project type indicators with confidence weights
const PROJECT_INDICATORS: ProjectIndicator[] = [
  // Node.js projects
  { type: "nodejs", files: ["package.json"], weight: 10 },
  { type: "nodejs", files: ["yarn.lock"], weight: 8 },
  { type: "nodejs", files: ["pnpm-lock.yaml"], weight: 8 },
  { type: "nodejs", files: ["node_modules"], directories: ["node_modules"], weight: 6 },
  
  // Python projects
  { type: "python", files: ["pyproject.toml"], weight: 10 },
  { type: "python", files: ["requirements.txt"], weight: 9 },
  { type: "python", files: ["setup.py"], weight: 9 },
  { type: "python", files: ["Pipfile"], weight: 8 },
  { type: "python", files: ["poetry.lock"], weight: 8 },
  { type: "python", files: ["conda.yaml", "environment.yml"], weight: 7 },
  { type: "python", directories: ["venv", ".venv", "__pycache__"], weight: 5 },
  
  // Go projects
  { type: "go", files: ["go.mod"], weight: 10 },
  { type: "go", files: ["go.sum"], weight: 8 },
  { type: "go", files: ["Gopkg.toml"], weight: 7 },
  
  // Java projects
  { type: "java", files: ["pom.xml"], weight: 10 },
  { type: "java", files: ["build.gradle", "build.gradle.kts"], weight: 10 },
  { type: "java", files: ["settings.gradle"], weight: 8 },
  { type: "java", files: ["gradlew"], weight: 7 },
  { type: "java", directories: ["src/main/java"], weight: 8 },
  
  // C# projects
  { type: "csharp", files: [".csproj", ".sln"], weight: 10 },
  { type: "csharp", files: ["packages.config"], weight: 7 },
  { type: "csharp", directories: ["bin", "obj"], weight: 5 },
  
  // Rust projects
  { type: "rust", files: ["Cargo.toml"], weight: 10 },
  { type: "rust", files: ["Cargo.lock"], weight: 8 },
  { type: "rust", directories: ["target"], weight: 6 },
  
  // PHP projects
  { type: "php", files: ["composer.json"], weight: 10 },
  { type: "php", files: ["composer.lock"], weight: 8 },
  { type: "php", directories: ["vendor"], weight: 6 },
  
  // Ruby projects
  { type: "ruby", files: ["Gemfile"], weight: 10 },
  { type: "ruby", files: ["Gemfile.lock"], weight: 8 },
  { type: "ruby", files: [".ruby-version"], weight: 6 },
  
  // Docker projects
  { type: "docker", files: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"], weight: 8 },
  { type: "docker", files: [".dockerignore"], weight: 5 },
  
  // Web projects
  { type: "web", files: ["index.html", "package.json"], weight: 6 },
  { type: "web", directories: ["public", "static", "assets"], weight: 4 },
  
  // Build tools
  { type: "build", files: ["Makefile", "CMakeLists.txt", "meson.build"], weight: 7 },
  { type: "build", files: [".github/workflows"], directories: [".github/workflows"], weight: 6 },
  
  // Version control (should be present in most projects)
  { type: "git", directories: [".git"], weight: 5 },
];

/**
 * Analyze a directory to determine if it contains a software project
 */
export function analyzeProject(projectPath: string): ProjectInfo | null {
  if (!existsSync(projectPath)) {
    return null;
  }

  const name = basename(projectPath);
  const types = new Set<string>();
  const indicators: string[] = [];
  let totalConfidence = 0;

  try {
    const entries = readdirSync(projectPath);
    const files = new Set<string>();
    const directories = new Set<string>();

    // Categorize entries
    for (const entry of entries) {
      const entryPath = join(projectPath, entry);
      try {
        const stat = statSync(entryPath);
        if (stat.isFile()) {
          files.add(entry);
          // Also check for extensions in files
          if (entry.includes('.')) {
            files.add('*' + entry.substring(entry.lastIndexOf('.')));
          }
        } else if (stat.isDirectory()) {
          directories.add(entry);
        }
      } catch {
        // Skip entries we can't stat
      }
    }

    // Check against project indicators
    for (const indicator of PROJECT_INDICATORS) {
      let matches = false;
      
      // Check files
      if (indicator.files) {
        for (const file of indicator.files) {
          if (files.has(file) || files.has(basename(file))) {
            matches = true;
            indicators.push(`${indicator.type}:${file}`);
            break;
          }
        }
      }
      
      // Check directories
      if (!matches && indicator.directories) {
        for (const dir of indicator.directories) {
          if (directories.has(dir)) {
            matches = true;
            indicators.push(`${indicator.type}:${dir}/`);
            break;
          }
        }
      }
      
      if (matches) {
        types.add(indicator.type);
        totalConfidence += indicator.weight;
      }
    }

    // Additional heuristics for confidence
    if (files.has('README.md') || files.has('README.rst') || files.has('README.txt')) {
      totalConfidence += 2;
      indicators.push('docs:README');
    }

    if (files.has('LICENSE') || files.has('LICENSE.txt') || files.has('MIT-LICENSE')) {
      totalConfidence += 1;
      indicators.push('legal:LICENSE');
    }

    // Normalize confidence (0-100 scale)
    const normalizedConfidence = Math.min(100, (totalConfidence / 20) * 100);

    if (types.size === 0 && normalizedConfidence < 5) {
      return null; // Not enough evidence of a project
    }

    return {
      path: normalizePath(projectPath),
      name,
      types: Array.from(types),
      confidence: normalizedConfidence,
      indicators
    };
  } catch {
    return null;
  }
}

/**
 * Enhanced auto-discovery that finds projects intelligently
 */
export function autoDiscoverProjects(
  rootPath: string, 
  config: AutoDiscoveryConfig = {}
): ProjectInfo[] {
  const {
    maxDepth = 3,
    minConfidence = 10,
    excludePatterns = [
      '**/node_modules/**',
      '**/.git/**', 
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      '**/.venv/**',
      '**/venv/**',
      '**/__pycache__/**',
      '**/bin/**',
      '**/obj/**'
    ],
    includeHidden = false
  } = config;

  const projects: ProjectInfo[] = [];
  const visited = new Set<string>();

  function shouldExclude(path: string): boolean {
    const normalized = normalizePath(path);
    return excludePatterns.some(pattern => {
      const regex = globToRegex(pattern);
      return regex.test(normalized);
    });
  }

  function globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }

  function searchDirectory(dirPath: string, depth: number) {
    if (depth > maxDepth) return;
    
    const normalizedPath = normalizePath(resolve(dirPath));
    if (visited.has(normalizedPath)) return;
    visited.add(normalizedPath);

    if (shouldExclude(dirPath)) return;

    // First, analyze current directory as potential project
    const projectInfo = analyzeProject(dirPath);
    if (projectInfo && projectInfo.confidence >= minConfidence) {
      projects.push(projectInfo);
      
      // If we found a strong project (high confidence), don't recurse deeper
      // This prevents finding nested projects inside strong parent projects
      if (projectInfo.confidence > 70) {
        return;
      }
    }

    // Recurse into subdirectories
    try {
      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        // Skip hidden directories unless configured to include them
        if (!includeHidden && entry.startsWith('.')) continue;
        
        const entryPath = join(dirPath, entry);
        
        try {
          const stat = statSync(entryPath);
          if (stat.isDirectory()) {
            searchDirectory(entryPath, depth + 1);
          }
        } catch {
          // Skip entries we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  searchDirectory(rootPath, 0);
  
  // Sort by confidence (highest first) and then by path
  return projects.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.path.localeCompare(b.path);
  });
}

/**
 * Extract meaningful repo name from project info
 */
export function getRepoName(project: ProjectInfo): string {
  // Try to get name from package.json if it's a Node.js project
  if (project.types.includes('nodejs')) {
    const packageJsonPath = join(project.path, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.name && typeof packageJson.name === 'string') {
          return packageJson.name.replace(/^@[^/]+\//, ''); // Remove scope prefix
        }
      } catch {
        // Fallback to directory name
      }
    }
  }

  // Try to get name from pyproject.toml for Python projects
  if (project.types.includes('python')) {
    const pyprojectPath = join(project.path, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
      try {
        const content = readFileSync(pyprojectPath, 'utf-8');
        const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
        if (nameMatch) {
          return nameMatch[1];
        }
      } catch {
        // Fallback to directory name
      }
    }
  }

  // Try to get name from Cargo.toml for Rust projects
  if (project.types.includes('rust')) {
    const cargoPath = join(project.path, 'Cargo.toml');
    if (existsSync(cargoPath)) {
      try {
        const content = readFileSync(cargoPath, 'utf-8');
        const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
        if (nameMatch) {
          return nameMatch[1];
        }
      } catch {
        // Fallback to directory name
      }
    }
  }

  // Default to directory name, cleaned up
  return project.name.replace(/[^a-zA-Z0-9\-_]/g, '-').toLowerCase();
}
