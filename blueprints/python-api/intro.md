# Documentation For The Python API Blueprint

This Blueprint specifies how to add and update a Polytope module for providing a Python API server.

Parent module: `polytope/python`. Read the bluetext documentation resource for this standard module to understand how to specify the `args` attributes. 

## Example of a Polytope Python API module

```yaml
modules:
  - id: api
    info: "Python API server (blueprint: python-api)"
    module: polytope/python
    args:
      image: python:3.13-slim
      code: { type: host, path: ./modules/api }
      cmd: bin/run
      services:
        - id: api
          ports:
            - port: 4000
              protocol: http
              expose-as: pt.value api-port
      env:
        - { name: PORT, value: pt.value api-port }
```

## Example of code to add to the Polytope .values_and_secrets.defaults.sh file
```bash
pt values set api-port 4000
pt values set api-host-internal api
pt values set api-host-external localhost
```

## Instructions For How To Add Python Packages

Fetch the documentation resource for the add-package-python module from the bluetext MCP server. Run the add-package-python module in accordance with this documenation.

## Adding The Module

Here are the steps you should take to add this module. 

### 1. Start by running the React Web App boilerplate
Fetch the documentation for the boilerplate module from the bluetext MCP server. 

Run the following command to generate the initial code for the Python API module: 

`pt run --non-interactive "boilerplate{source-path: https://github.com/Cillers-com/boilerplate-python-api, target-path: my-module-code-root-path}"`

Where `my-module-code-root-path` should be replaced by the relative path to where you should place the module code root directory, `modules/api` by default. 

### 2. Make any necessary modifications
Check the generated boilerplate code and see if any changes need to be made to fulfill the user's request. 

### 3. Add needed packages using the instructions provided above.



