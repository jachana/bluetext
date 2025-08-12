# add-package-python Polytope Module

This module adds Python packages to a Python module using uv package manager.

Check if the add-package-python module is added to the polytope.yml file. If not, add it. If you try to run this module before adding it, you will fail. 

## Polytope Module spec
```yaml
  - id: add-package-python
    info: Adds uv packages in a Python module
    module: polytope/container
    params:
      - id: packages
        info: Comma-separated list of packages to add
        type: str
      - id: module-code-path
        info: Relative path of the module code's root directory
        type: str
    args:
      image: python:3.13-slim
      cmd:
        - sh
        - -c
        - |
          set -eu
          echo "Installing uv..."
          pip install uv
          echo "Adding python packages: $PACKAGES"
          cd "/module-code"
          if [ ! -f "pyproject.toml" ]; then
            echo "ERROR: No pyproject.toml found"
            exit 1
          fi
          # Add packages to pyproject.toml
          uv add $PACKAGES
          echo "Done!"
      mounts:
        - path: /module-code
          source:
            type: host
            path: pt.param module-code-path
      env:
        - name: PACKAGES
          value: pt.param packages
```

## Usage

Use the add-package-python Polytope module to install packages via:

```bash
pt run --non-interactive "uv-add{packages: '<packages>', module-code-path: '<module-code-path>'}"
```

### Parameters

- `packages`: Comma-separated list of packages, with either just the name of the package or including a specific version `<package-name>==<version>`. Only specify the version if the user has specifically asked for it. Otherwise always specify only the name of the package.
- `module-code-path`: The relative path of the modules's root directory.

### Examples

```bash
# Add a single package
pt run --non-interactive "uv-add{packages: 'fastapi', module-code-path: 'api'}"

# Add multiple packages
pt run --non-interactive "uv-add{packages: 'fastapi uvicorn', module-code-path: 'api'}"

# Add packages with specific versions
pt run --non-interactive "uv-add{packages: 'fastapi==0.104.1 uvicorn==0.24.0', module-code-path: 'api'}"
```

## Requirements

- The target module code  directory must contain a `pyproject.toml` file
- The operation will fail if no `pyproject.toml` file is found
- The initial module code boilerplate should be created using the python-api blueprint

## Implementation Details

- Uses Python image with uv package manager
- Mounts the module's code root directory to `/module-code` in the container
- Runs `uv add <packages>` to add packages to pyproject.toml and install them
- Validates that pyproject.toml exists before attempting to add packages

## Error Handling

The module will exit with an error if:
- No `pyproject.toml` file is found in the module's code root directory
- The uv command fails for any reason
- Invalid package names or versions are specified

## Recommended Packages

For API servers, use:
- `fastapi` - Modern, fast web framework for building APIs
- `uvicorn` - ASGI server implementation for running FastAPI applications
