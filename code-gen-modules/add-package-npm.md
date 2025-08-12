# add-package-npm Polytope Module

This module adds npm packages to a Node.js module using yarn with the `--no-install` flag.

Check if the add-package-npm module is added to the polytope.yml file. If not, add it. If you try to run this module before adding it, you will fail. 

## Polytope Module Spec

```yaml
 - id: add-package-npm
    info: Adds npm packages in an npm compatible module, such as Node.js, Deno or Bun. 
    module: polytope/container
    params:
      - id: packages
        info: Space-separated list of packages to add
        type: str
      - id: module-code-path
        info: Relative path of the module's code root directory
        type: str
    args:
      image: node:18-slim
      cmd:
        - sh
        - -c
        - |
          set -eu
          echo "Adding npm packages: $PACKAGES"
          cd "/module-code"
          if [ ! -f "package.json" ]; then
            echo "ERROR: No package.json found"
            exit 1
          fi
          # Add packages using yarn with --no-install flag
          yarn add $PACKAGES --no-install 
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

Use the add-package-npm Polytope module to install packages via:

```bash
pt run --non-interactive "add-package-npm{packages: '<packages>', module-code-path: '<module-code-path>'}"
```

### Parameters

- `packages`: Space-separated list of packages, with either just the name of the package or including a specific version `<package-name>@<version>`. Only specify the version if the user has specifically asked for it. Otherwise always specify only the name of the package.
- `module-code-path`: The relative path of the modules's code root directory.

### Examples

```bash
# Add a single package
pt run --non-interactive "add-package-npm{packages: 'react', module-code-path: 'web-app'}"

# Add multiple packages
pt run --non-interactive "add-package-npm{packages: 'react react-dom', module-code-path: 'web-app'}"

# Add packages with specific versions
pt run --non-interactive "add-package-npm{packages: 'react@18.2.0 react-dom@18.2.0', module-code-path: 'web-app'}"
```

## Requirements

- The target module code root directory must contain a `package.json` file
- The operation will fail if no `package.json` file is found

## Implementation Details

- Uses Node.js 18 slim image
- Mounts the module's root code directory to `/module-code` in the container
- Runs `yarn add <packages> --no-install` to add packages to package.json without installing them
- Validates that package.json exists before attempting to add packages

## Error Handling

The module will exit with an error if:
- No `package.json` file is found in the module's code root directory
- The yarn command fails for any reason
