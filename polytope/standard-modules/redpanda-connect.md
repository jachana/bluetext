# polytope/redpanda-connect

Runs Redpanda Connect for data streaming and transformation pipelines.

## Module Specification

```yml
info: Runs Redpanda connect.
id: connect
params:
- id: image
  info: The image to use.
  name: Image
  type: [default, str, docker.redpanda.com/redpandadata/connect]
- id: container-id
  info: The ID to give the spawned container.
  name: Container ID
  type: [default, str, redpanda-connect]
- {id: config-file, info: Redpanda connect config file., name: Config file, type: mount-source}
- id: restart
  info: Restart policy for the container.
  name: Restart policy
  type:
  - default
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
  - {policy: always, max-restarts: null}
- id: port
  info: The console HTTP port.
  name: HTTP Port
  type: [default, int, 4195]
module: polytope/container
args:
  image: pt.param image
  id: pt.param container-id
  mounts:
  - {path: /connect.yaml, source: pt.param config-file}
  restart: pt.param restart
  services:
  - id: redpanda-connect
    ports:
    - {port: pt.param port, protocol: http}
```

## Description

This module provides Redpanda Connect (formerly Benthos), a high-performance data streaming platform for building real-time data pipelines. It supports a wide variety of input and output connectors, processors, and transformations.

## Parameters

- **image**: The Docker image to use (default: `docker.redpanda.com/redpandadata/connect`)
- **container-id**: Container identifier (default: `redpanda-connect`)
- **config-file**: Required configuration file for Redpanda Connect pipeline definition
- **restart**: Container restart policy (default: always restart)
- **port**: HTTP port for the management API (default: 4195)

## Services

The module exposes:

- **redpanda-connect** (configurable port, default 4195): Management API and metrics endpoint

## Usage Example

```yaml
modules:
  - id: data-pipeline
    module: polytope/redpanda-connect
    args:
      config-file:
        type: host
        path: ./config/connect-pipeline.yaml
      port: 4195

templates:
  - id: streaming-pipeline
    run:
      - redpanda
      - data-pipeline
```

## Configuration File Example

The config-file should contain a Redpanda Connect pipeline configuration:

```yaml
input:
  kafka:
    addresses: ["redpanda:9092"]
    topics: ["input-topic"]

pipeline:
  processors:
    - mapping: |
        root.processed_at = now()
        root.data = this.data.uppercase()

output:
  kafka:
    addresses: ["redpanda:9092"]
    topic: "output-topic"
