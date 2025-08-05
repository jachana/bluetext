## Polytope Module Spec

Example of a Polytope web-app module:
```yaml
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

## Generate the code

### 1. Start by running the React Web App boilerplate
Fetch the documentation for the boilerplate module from the bluetext MCP server.

Check if the boilerplate module is added to the polytope.yml file. If not, add it. 

Run the following command to generate the initial code for the React Web App module: 

`pt run --non-interactive "boilerplate{source-path: https://github.com/Cillers-com/boilerplate-react-web-app, target-path: my-module-code-root-path}"`

Where `my-module-code-root-path` should be replace by the relative path to where you should place the module code root directory, `modules/web-app` by default. 

### 2. Make any necessary modifications
Check the generated boilerplate code and see if any changes need to be made to fulfill the user's request. 

### 3. Add needed packages using the add-package-npm module
Fetch the documentation for the add-package-npm module from the bluetext MCP server.

Check if the add-package-npm module is added to the polytope.yml file. If not, add it. 

Run the add-package-npm module in accordance with the documenation. 


## Poltope Values
Example of code to add to the Polytope .values_and_secrets.defaults.sh file:
```bash
pt values set web-app-port 3000
```

