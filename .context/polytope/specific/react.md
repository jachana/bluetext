# Directives for Creating a React App with Polytope

Create a separate project directory for the frontend, even if it's the only project you are creating.

Use bun and React with React Router v7.

Use environment variables for configuration, and make sure to 1. set these in the corresponding Polytope module, and 2. expose them as params in the module.

Generate scaffolding via `pt run create-subproject{template: frontend, path: my-project-path}`, and use `bun add` to install dependencies. DO NOT try to guess package versions! Let bun handle this for you!

Example of a Polytope frontend module:
```yaml
modules:
  - id: frontend
    params:
      - id: cmd
        type: [default, str, ./bin/run] # default to the run script
      - id: api-base-url
        type: [default, str, http://localhost:3000] # default backend URL
      - id: port
        type: [default, int, 8000] # default port for the frontend
    module: polytope/node
    args:
      id: frontend
      image: oven/bun:slim # specify an image with bun
      code: { type: host, path: frontend } # mount the `frontend` directory (assuming the code is there)
      cmd: pt.param cmd
      env:
        - { name: PORT, value: pt.param port }
        - { name: VITE_API_BASE_URL, value: pt.param api-base-url }
      restart:
        policy: always # always restart on failure
      services:
        - id: frontend
          ports: [{protocol: http, port: pt.param port, expose-as: pt.param port}]
      mounts:
        # Use volumes to cache dependencies:
        - { path: /root/.cache/, source: { type: volume, id: dependency-cache }}
        - { path: /root/.bun/, source: { type: volume, id: bun-cache }}
        - { path: /app/node_modules/, source: { type: volume, id: node-modules }}
```
