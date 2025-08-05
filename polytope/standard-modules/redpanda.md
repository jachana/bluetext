# polytope/redpanda

Runs a single Redpanda node in dev mode.

## Module Specification

```yml
info: Runs a single Redpanda node in dev mode.
id: redpanda
params:
- id: image
  info: The container image to use.
  name: Container Image
  type: [default, str, 'docker.redpanda.com/redpandadata/redpanda:v23.3.11']
- id: data-volume
  info: Volume to use for data.
  name: Data Volume
  type: [maybe, mount-source]
- id: log-level
  info: The default log level.
  name: Log level
  type:
  - default
  - [enum, trace, debug, info, warn, error]
  - info
- id: restart
  info: Restart policy for the containers.
  name: Restart policy
  type:
  - default
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
  - {policy: always, max-restarts: null}
module: polytope/container
args:
  id: redpanda
  image: pt.param image
  restart: pt.param restart
  cmd:
  - redpanda
  - start
  - --kafka-addr=0.0.0.0:9092
  - --advertise-kafka-addr=redpanda:9092
  - --pandaproxy-addr=0.0.0.0:8082
  - --advertise-pandaproxy-addr=redpanda:8082
  - --rpc-addr=0.0.0.0:33145
  - --advertise-rpc-addr=redpanda:33145
  - --schema-registry-addr=0.0.0.0:8081
  - --mode=dev-container
  - --smp=1
  - "--default-log-level={pt.param log-level}"
  mounts: |-
    #pt-clj (when-let [v (:data-volume params)]
      [{:path "/var/lib/redpanda/data", :source v}])
  services:
  - id: redpanda
    ports:
    - {port: 9092, protocol: tcp, label: kafka}
    - {port: 8082, protocol: http, label: pandaproxy}
    - {port: 8081, protocol: http, label: schema-registry}
    - {port: 9644, protocol: http, label: admin-api}
    - {port: 33145, protocol: tcp, label: rpc}
```

## Description

This module provides a single-node Redpanda instance running in development mode. Redpanda is a Kafka-compatible streaming platform that's designed to be faster and more resource-efficient than Apache Kafka.

## Parameters

- **image**: The Docker image to use for Redpanda (default: `docker.redpanda.com/redpandadata/redpanda:v23.3.11`)
- **data-volume**: Optional volume for persistent data storage
- **log-level**: Logging level (trace, debug, info, warn, error - default: info)
- **restart**: Container restart policy (default: always restart)

## Services

The module exposes the following services:

- **kafka** (port 9092): Kafka protocol endpoint
- **pandaproxy** (port 8082): HTTP proxy for Kafka
- **schema-registry** (port 8081): Schema registry endpoint
- **admin-api** (port 9644): Administrative API
- **rpc** (port 33145): Internal RPC endpoint

## Usage Example

```yaml
modules:
  - id: my-redpanda
    module: polytope/redpanda
    args:
      data-volume:
        type: volume
        scope: project
        id: redpanda-data
      log-level: debug

templates:
  - id: messaging-stack
    run:
      - my-redpanda
