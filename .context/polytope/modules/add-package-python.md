# add-package-python Polytope Module

This module adds Python packages to a Python component using uv package manager.

## Usage

Use the add-package-python Polytope module to install packages via:

```bash
pt run --non-interactive "uv-add{packages: '<packages>', component-path: '<component-path>'}"
```

### Parameters

- `packages`: Comma-separated list of packages, with either just the name of the package or including a specific version `<package-name>==<version>`. Only specify the version if the user has specifically asked for it. Otherwise always specify only the name of the package.
- `component-path`: The relative path of the component's root directory.

### Examples

```bash
# Add a single package
pt run --non-interactive "uv-add{packages: 'fastapi', component-path: 'api'}"

# Add multiple packages
pt run --non-interactive "uv-add{packages: 'fastapi uvicorn', component-path: 'api'}"

# Add packages with specific versions
pt run --non-interactive "uv-add{packages: 'fastapi==0.104.1 uvicorn==0.24.0', component-path: 'api'}"
```

## Requirements

- The target component directory must contain a `pyproject.toml` file
- The operation will fail if no `pyproject.toml` file is found
- The component should be created using the python-api template

## Implementation Details

- Uses Python image with uv package manager
- Mounts the component's root directory to `/component` in the container
- Runs `uv add <packages>` to add packages to pyproject.toml and install them
- Validates that pyproject.toml exists before attempting to add packages

## Error Handling

The module will exit with an error if:
- No `pyproject.toml` file is found in the component directory
- The uv command fails for any reason
- Invalid package names or versions are specified

## Recommended Packages

For API servers, use:
- `fastapi` - Modern, fast web framework for building APIs
- `uvicorn` - ASGI server implementation for running FastAPI applications
