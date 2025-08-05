# polytope/node

Runs a Node.js container with full configuration options for JavaScript applications.

## Module Specification

```yml
info: Runs a Node.js container.
id: node
params:
- id: image
  info: The container image to use.
  name: Image
  type: [default, str, 'public.ecr.aws/docker/library/node:21.7.0-slim']
- id: code
  info: Optional source code directory to mount into the container.
  name: Code
  type: [maybe, mount-source]
- id: cmd
  info: The command to run. Runs a Node shell if left blank.
  name: Command
  type:
  - maybe
  - - either
    - str
    - [str]
- id: env
  info: Environment variables for the container.
  name: Environment variables
  type:
  - maybe
  - - name: str
      value: [either, str, int, bool]
- id: id
  info: The container's ID/name.
  name: ID
  type: [maybe, id]
- id: package
  info: Optional package.json file to install before running the command.
  name: Package file
  type: [maybe, mount-source]
- id: mounts
  info: Additional files or directories to mount into the container.
  name: Mounts
  type:
  - maybe
  - - - maybe
      - {source: mount-source, path: absolute-path}
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - [service-spec]
module: polytope/container
args:
  cmd: |-
    #pt-clj (if (:package params)
      (if (or
           (nil? (:cmd params))
           (string? (:cmd params)))
        (str
         "sh -c 'npm install /package.json; "
         (or (:cmd params) "node")
         "'")
        (str
         "sh -c 'npm install /package.json; "
         (str/join " " (:cmd params))
         "'"))
      (:cmd params))
  env: pt.param env
  services: pt.param services
  image: pt.param image
  id: pt.param id
  mounts: |-
    #pt-clj (vec
     (concat
     (when-let [code (:code params)]
      [{:path "/app", :source code}])
     (when-let [reqs (:package params)]
      [{:path "/package.json", :source reqs}])
     (:mounts params)))
  restart: pt.param restart
  workdir: /app
```

## Description

This module provides a full-featured Node.js runtime environment with support for dependency management, custom code mounting, service exposure, and flexible command execution.

## Parameters

- **image**: The Docker image to use (default: `public.ecr.aws/docker/library/node:21.7.0-slim`)
- **code**: Optional source code directory to mount at `/app`
- **cmd**: Command to run (default: `node` shell)
- **env**: Environment variables for the container
- **id**: Container identifier
- **package**: Optional package.json file for dependency installation
- **mounts**: Additional file/directory mounts
- **restart**: Container restart policy
- **services**: Ports to expose as services

## Services

Services are configurable based on the `services` parameter. Each service can expose different ports with various protocols.

## Usage Example

```yaml
modules:
  - id: web-app
    module: polytope/node
    args:
      code:
        type: host
        path: ./src
      package:
        type: host
        path: ./package.json
      cmd: "npm start"
      env:
        - name: NODE_ENV
          value: development
        - name: PORT
          value: 3000
      services:
        - id: web
          ports:
            - port: 3000
              protocol: http

templates:
  - id: node-app
    run:
      - web-app
```

## Features

- **Automatic Dependency Installation**: Installs package.json dependencies if provided
- **Code Mounting**: Mounts source code to `/app` working directory
- **Service Exposure**: Configurable port exposure for web services
- **Environment Configuration**: Full environment variable support
- **Flexible Commands**: Support for both string and array command formats

## Working Directory

The container's working directory is set to `/app`, where your code will be mounted if the `code` parameter is provided.

## Package Management

If a `package` parameter is provided, the module will automatically run `npm install` before executing your command, ensuring all dependencies are available.
