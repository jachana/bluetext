# polytope/python!simple

Runs a Python container with minimal configuration for simple applications.

## Module Specification

```yml
info: Runs a Python container with minimal configuration.
id: simple
params:
- id: code
  info: Optional source code directory to mount into the container.
  name: Code
  type: [maybe, mount-source]
- id: cmd
  info: The command to run. Runs a Python shell if left blank.
  name: Command
  type: [maybe, str]
- id: env
  info: Environment variables for the container.
  name: Environment variables
  type:
  - maybe
  - [env-var]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - - {id: str, port: int}
module: polytope/container
args:
  cmd: pt.param cmd
  env: pt.param env
  services: |-
    #pt-clj (map
     (fn
     [{:keys [id port]}]
     {:id    id
     :ports [{:port port, :protocol :http}]})
     (:services params))
  image: python:3.11
  update-image: false
  mounts: |-
    #pt-clj (vec
     (concat
     (when-let [code (:code params)]
      [{:path "/app", :source code}])
     (when-let [reqs (:requirements params)]
      [{:path "/requirements", :source reqs}])))
  workdir: /app
```

## Description

This module provides a simplified Python runtime environment with minimal configuration, ideal for quick prototyping and simple applications.

## Parameters

- **code**: Optional source code directory to mount at `/app`
- **cmd**: Command to run (default: Python shell)
- **env**: Environment variables for the container
- **services**: Simple service definitions with id and port

## Services

Services are defined with a simplified format:
- **id**: Service identifier
- **port**: HTTP port to expose

## Usage Example

```yaml
modules:
  - id: simple-app
    module: polytope/python!simple
    args:
      code:
        type: host
        path: ./app
      cmd: "python server.py"
      env:
        - name: PORT
          value: "8000"
      services:
        - id: web
          port: 8000

templates:
  - id: simple-stack
    run:
      - simple-app
```

## Key Features

- **Minimal Setup**: Uses Python 3.11 with minimal configuration
- **Quick Start**: No dependency management - ready to run immediately
- **Simple Services**: Easy HTTP service exposure
- **Development Focused**: Optimized for rapid prototyping

## Working Directory

The container's working directory is set to `/app`, where your code will be mounted if the `code` parameter is provided.

## Image Policy

This module uses `update-image: false` to avoid unnecessary image updates during development.
