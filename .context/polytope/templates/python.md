# Directives for Creating A Python Component

## Creating the component
Create a separate directory for the component, even if it's the only component you are creating.

Use the create-component Polytope module to create the project via 
`pt run --non-interactive "create-component{template: python-api, path: my-subproject-root-path}"`. 

## Package managment
Use the uv-install Polytope module to install packages via 
`pt run --non-interactive "uv-add{packages: '<packages>', component-path='<component-path>'}"`, where:
* `packages` is a comma-separted list of packages, with either just the name of the package or including a specific version 
`<package-name>==<version>`. Only specify the version if the user has specifically asked for it. Otherwise always specify 
only the name of the package. 
* `component-path` is the relative path of the component's root directory.

## Specific packages to use
For api servers, use fastapi with uvicorn.
