Example of a Polytope Python API module:
```yaml
modules:
  - id: api
    info: Python API server
    module: polytope/python
    args:
      image: python:3.13-slim
      code: { type: host, path: ./api }
      cmd: bin/run
      services:
        - id: api
          ports:
            - port: 4000
              protocol: http
              expose-as: pt.value api_port
```
