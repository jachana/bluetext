# Documentation for boilerplate module for Generating code from Git repositories

The boilerplate module supports creating the initial scaffolding code by downloading boilerplate code from any Git repository.

## Usage

```bash
pt run --non-interactive "boilerplate{source-path: <git-repository-url>, target-path: <target-directory>}"
```

## Examples

| Module Type | Repository | Command |
|-------------|------------|---------|
| React app   | https://github.com/Cillers-com/boilerplate-react-web-app | `pt run --non-interactive "boilerplate{source-path: https://github.com/Cillers-com/boilerplate-react-web-app, target-path: modules/web-app}"` |
| Python API  | https://github.com/Cillers-com/boilerplate-python-api | `pt run --non-interactive "boilerplate{source-path: https://github.com/Cillers-com/boilerplate-python-api, target-path: modules/api}"` |

## Parameters

- `source-path`: Git repository URL to clone boilerplate code from (required)
- `target-path`: Path relative to the repo root where the module's code will be created (required)

## How it works

The boilerplate module:
1. Downloads the specified Git repository using `git clone --depth 1`
2. Copies all files (including hidden files) to the target path
3. Excludes the `.git` directory from the copy
4. Cleans up temporary files

## Prerequisites

- Internet connection to access the remote repositories
- Git is automatically installed in the container during execution

## Flexibility

This module can clone any publicly accessible Git repository, not just the predefined boilerplate repositories. You can use it with:
- GitHub repositories
- GitLab repositories  
- Any other Git-compatible repository hosting service
- Public repositories (authentication for private repositories is not currently supported)

Before running the boilerplate module, read the files in the `.blueprints/<blueprint-id>/context` directory for Polytope-specific documentation when using the standard blueprints.
