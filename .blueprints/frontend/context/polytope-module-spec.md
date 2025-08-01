Example of a Polytope frontend module:
```yaml
modules:
  - id: frontend
    params:
      - id: cmd
        type: [default, str, ./bin/run] # default to the run script
    module: polytope/node
    args:
      id: frontend
      image: oven/bun:slim # specify an image with bun
      code: { type: host, path: ./modules/frontend } # mount the `modules/frontend` directory (assuming the code is there)
      cmd: pt.param cmd
      env:
        - { name: PORT, value: pt.value frontend-port }
      restart:
        policy: always # always restart on failure
      services:
        - id: frontend
          ports: [{protocol: http, port: pt.value frontend-port, expose-as: pt.value frontend-port}]
      mounts:
        # Use volumes to cache dependencies:
        - { path: /root/.cache/, source: { type: volume, id: dependency-cache }}
        - { path: /root/.bun/, source: { type: volume, id: bun-cache }}
        - { path: /app/node_modules/, source: { type: volume, id: node-modules }}
```
