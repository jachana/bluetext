# polytope/container

Runs a Docker container with full configuration options - the foundational module for all containerized workloads.

## Module Specification

```yml
info: Runs a Docker container.
id: container
params:
- {id: image, info: The Docker image to run., name: Image, type: docker-image}
- id: id
  info: The container's ID/name.
  name: ID
  type: [maybe, id]
- id: cmd
  info: The command to run in the container.
  name: Command
  type:
  - maybe
  - - either
    - str
    - - [maybe, str]
- id: mounts
  info: Code or files to mount into the container.
  name: Mounts
  type:
  - maybe
  - - - maybe
      - {source: mount-source, path: absolute-path}
- id: env
  info: Environment variables for the container.
  name: Environment variables
  type:
  - maybe
  - - [maybe, env-var]
- id: workdir
  info: The container's working directory.
  name: Working directory
  type: [maybe, absolute-path]
- id: entrypoint
  info: The container's entrypoint.
  name: Entrypoint
  type:
  - maybe
  - - either
    - str
    - - [maybe, str]
- id: no-stdin
  info: Whether to keep the container's stdin closed.
  name: Non-interactive
  type: [default, bool, false]
- id: tty
  info: Whether to allocate a pseudo-TTY for the container.
  name: TTY
  type: [default, bool, true]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - [service-spec]
- id: datasets
  info: Paths in the container to store as datasets upon termination.
  name: Datasets
  type:
  - maybe
  - - {path: absolute-path, sink: dataset-sink}
- id: user
  info: The user (name or UID) to run commands in the container as.
  name: User
  type:
  - maybe
  - [either, int, str]
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy:
    - maybe
    - [enum, never, always, on-failure]
    max-restarts: [maybe, int]
- id: scaling
  info: How many replicas to create.
  name: Replicas
  type: [maybe, int]
- id: update-image
  info: Image update policy.
  name: Update image
  type: [default, bool, false]
- id: instance-type
  info: The instance type to run the container on.
  name: Instance type
  type: [maybe, instance-type]
- id: resources
  info: The resources to allocate for the container.
  name: Resources
  type:
  - maybe
  - cpu:
      request: [maybe, num]
      limit: [maybe, num]
    memory:
      request: [maybe, data-size]
      limit: [maybe, data-size]
code: |-
  #pt-clj (let [spec (merge
              (dissoc params :services :datasets)
              (when-let [replicas (:scaling params)]
               {:scaling {:replicas replicas, :type "manual"}}))
        id   (pt/spawn spec)]
    (pt/await-started
     {:ref id, :type "deployment"})
    (doseq [service (:services params)]
      (pt/open-service service))
    (let [exit-code (pt/await-done
                     {:ref id, :type "deployment"})]
      (when (not= 0 exit-code)
        (pt/fail
         "The container exited with a nonzero exit code."
         {:exit-code exit-code})))
    (doseq [{:keys [path sink]} (:datasets params)]
      (pt/store-dataset
       {:container-id id
       :path         path
       :type         "container-path"}
       sink)))
```

## Description

This is the foundational module for running Docker containers in Polytope. It provides comprehensive configuration options for containerized workloads and serves as the base for all other container-based modules.

## Parameters

- **image**: Docker image to run (required)
- **id**: Container identifier
- **cmd**: Command to execute in the container
- **mounts**: Files/directories to mount into the container
- **env**: Environment variables
- **workdir**: Working directory inside the container
- **entrypoint**: Container entrypoint override
- **no-stdin**: Whether to close stdin (default: false)
- **tty**: Whether to allocate a TTY (default: true)
- **services**: Ports to expose as services
- **datasets**: Paths to capture as datasets on termination
- **user**: User to run commands as
- **restart**: Restart policy configuration
- **scaling**: Number of replicas to create
- **update-image**: Whether to update the image (default: false)
- **instance-type**: Specific instance type for the container
- **resources**: CPU and memory resource limits

## Services

Services expose container ports for external access. Each service can specify:
- **id**: Service identifier
- **ports**: Port mappings with protocol, port number, and optional exposure settings

## Usage Example

```yaml
modules:
  - id: web-server
    module: polytope/container
    args:
      image: nginx:alpine
      mounts:
        - source:
            type: host
            path: ./html
          path: /usr/share/nginx/html
      services:
        - id: web
          ports:
            - port: 80
              protocol: http
      restart:
        policy: always

templates:
  - id: web-stack
    run:
      - web-server
```

## Advanced Features

- **Scaling**: Create multiple replicas of the same container
- **Resource Management**: Set CPU and memory limits
- **Dataset Capture**: Automatically save container paths as datasets
- **Health Monitoring**: Built-in container lifecycle management
- **Service Discovery**: Automatic service registration and exposure

## Implementation Details

This module uses Polytope's native container orchestration API to:
1. Spawn the container deployment
2. Wait for startup completion
3. Open configured services
4. Monitor container execution
5. Handle exit codes and failures
6. Capture datasets on termination

This is the most flexible and powerful module for containerized workloads in Polytope.
