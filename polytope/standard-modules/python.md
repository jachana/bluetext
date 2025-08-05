# polytope/python

Runs a Python container with full configuration options for applications and services.

## Module Specification

```yml
info: Runs a Python container.
id: python
params:
- id: image
  info: The container image to use.
  name: Image
  type: [default, str, 'public.ecr.aws/docker/library/python:3.12.2-slim-bookworm']
- id: code
  info: Optional source code directory to mount into the container.
  name: Code
  type: [maybe, mount-source]
- id: cmd
  info: The command to run. Runs a Python shell if left blank.
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
  - - [maybe, env-var]
- id: requirements
  info: Optional requirements.txt file to install before running the command.
  name: Requirements file
  type: [maybe, mount-source]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - [service-spec]
- id: id
  info: The container's ID/name.
  name: ID
  type: [maybe, id]
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
module: polytope/container
args:
  cmd: |-
    #pt-clj (if (:requirements params)
      (if (or
           (nil? (:cmd params))
           (string? (:cmd params)))
        (str
         "sh -c 'pip install -r /requirements.txt; "
         (or (:cmd params) "python")
         "'")
        (str
         "sh -c 'pip install -r /requirements.txt; "
         (str/join " " (:cmd params))
         "'"))
      (:cmd params))
  env: pt.param env
  services: pt.param services
  id: pt.param id
  image: pt.param image
  mounts: |-
    #pt-clj (vec
     (concat
     (when-let [code (:code params)]
      [{:path "/app", :source code}])
     (when-let [reqs (:requirements params)]
      [{:path "/requirements.txt", :source reqs}])
     (:mounts params)))
  restart: pt.param restart
  workdir: /app
```

## Description

This module provides a full-featured Python runtime environment with support for dependency management, custom code mounting, service exposure, and flexible command execution.

## Parameters

- **image**: The Docker image to use (default: `public.ecr.aws/docker/library/python:3.12.2-slim-bookworm`)
- **code**: Optional source code directory to mount at `/app`
- **cmd**: Command to run (default: `python` shell)
- **env**: Environment variables for the container
- **requirements**: Optional requirements.txt file for dependency installation
- **services**: Ports to expose as services
- **id**: Container identifier
- **mounts**: Additional file/directory mounts
- **restart**: Container restart policy

## Services

Services are configurable based on the `services` parameter. Each service can expose different ports with various protocols.

## Usage Example

```yaml
modules:
  - id: api-server
    module: polytope/python
    args:
      code:
        type: host
        path: ./src
      requirements:
        type: host
        path: ./requirements.txt
      cmd: "python app.py"
      env:
        - name: FLASK_ENV
          value: development
        - name: DATABASE_URL
          value: "postgresql://postgres@postgres:5432/myapp"
      services:
        - id: api
          ports:
            - port: 8000
              protocol: http

templates:
  - id: python-app
    run:
      - postgres
      - api-server
```

## Features

- **Automatic Dependency Installation**: Installs requirements.txt if provided
- **Code Mounting**: Mounts source code to `/app` working directory
- **Service Exposure**: Configurable port exposure for web services
- **Environment Configuration**: Full environment variable support
- **Flexible Commands**: Support for both string and array command formats

## Working Directory

The container's working directory is set to `/app`, where your code will be mounted if the `code` parameter is provided.
