Example of a Polytope web-app module:
```yaml
modules:
  - id: web-app
    params:
      - id: cmd
        type: [default, str, ./bin/run] # default to the run script
    module: polytope/node
    args:
      id: web-app
      image: oven/bun:slim # specify an image with bun
      code: { type: host, path: ./modules/web-app } # mount the `modules/web-app` directory (assuming the code is there)
      cmd: pt.param cmd
      env:
        - { name: PORT, value: pt.value web-app-port }
      restart:
        policy: always # always restart on failure
      services:
        - id: web-app
          ports: [{protocol: http, port: pt.value web-app-port, expose-as: pt.value web-app-port}]
      mounts:
        # Use volumes to cache dependencies:
        - { path: /root/.cache/, source: { type: volume, id: dependency-cache }}
        - { path: /root/.bun/, source: { type: volume, id: bun-cache }}
        - { path: /app/node_modules/, source: { type: volume, id: node-modules }}
```
