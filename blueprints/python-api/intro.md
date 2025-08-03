

## Boilerplate

Run the following command to generate the boilerplate code for this blueprint. 

`pt run --non-interactive "boilerplate{source-path: https://github.com/Cillers-com/boilerplate-python-api, target-path: my-module-code-root-path}"`

Where `my-module-code-root-path` should be replace by the relative path to where you should place the module code root directory, `modules/api` by default. 

## Polytope Module Spec
Example of a Polytope Python API module:
```yaml

- id: api
    info: Python API server
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
              expose-as: pt.value api_port
```

# Polytope Values

Example of code to add to the Polytope .values_and_secrets.defaults.sh file:
```bash
pt values set api-port 4000
pt values set api-host-internal api
pt values set api-host-external localhost
```
