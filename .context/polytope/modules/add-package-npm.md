# add-package-npm Polytope Module

This module adds npm packages to a Node.js component using yarn with the `--no-install` flag.

## Usage

Use the add-package-npm Polytope module to install packages via:

```bash
pt run --non-interactive "add-package-npm{packages: '<packages>', component-path: '<component-path>'}"
```

### Parameters

- `packages`: Space-separated list of packages, with either just the name of the package or including a specific version `<package-name>@<version>`. Only specify the version if the user has specifically asked for it. Otherwise always specify only the name of the package.
- `component-path`: The relative path of the component's root directory.

### Examples

```bash
# Add a single package
pt run --non-interactive "add-package-npm{packages: 'react', component-path: 'src/frontend'}"

# Add multiple packages
pt run --non-interactive "add-package-npm{packages: 'react react-dom', component-path: 'src/frontend'}"

# Add packages with specific versions
pt run --non-interactive "add-package-npm{packages: 'react@18.2.0 react-dom@18.2.0', component-path: 'src/frontend'}"
```

## Requirements

- The target component directory must contain a `package.json` file
- The operation will fail if no `package.json` file is found

## Implementation Details

- Uses Node.js 18 slim image
- Mounts the component's root directory to `/component` in the container
- Runs `yarn add --no-install <packages>` to add packages to package.json without installing them
- Validates that package.json exists before attempting to add packages

## Error Handling

The module will exit with an error if:
- No `package.json` file is found in the component directory
- The yarn command fails for any reason
