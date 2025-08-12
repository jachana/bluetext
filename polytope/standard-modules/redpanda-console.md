# polytope/redpanda!console

Runs the Redpanda console web UI for managing and monitoring Redpanda/Kafka clusters.

## Module Specification

```yml
info: Runs the Redpanda console.
id: console
params:
- id: image
  info: The image to use.
  name: Image
  type: [default, str, 'docker.redpanda.com/redpandadata/console:v2.4.5']
- id: container-id
  info: The ID to give the spawned container.
  name: Container ID
  type: [default, str, redpanda-console]
- id: brokers
  info: List of host-port pairs to use to connect to the Kafka/Redpanda cluster.
  name: Brokers
  type:
  - default
  - - {host: str, port: int}
  - - {host: redpanda, port: 9092}
- id: schema-registry-url
  info: Schema Registry to connect to.
  name: Schema Registry URL
  type: [maybe, str]
- id: admin-url
  info: Redpanda admin URL to connect to.
  name: Redpanda admin URL
  type: [maybe, str]
- id: log-level
  info: The log level.
  name: Log level
  type:
  - default
  - [enum, debug, info, warn, error, fatal]
  - info
- id: port
  info: The console HTTP port.
  name: HTTP Port
  type: [default, int, 8079]
- id: restart
  info: Restart policy for the container.
  name: Restart policy
  type:
  - default
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
  - {policy: always, max-restarts: null}
module: polytope/container
args:
  image: pt.param image
  id: pt.param container-id
  env:
  - {name: CONFIG_FILEPATH, value: /etc/redpanda-console-config.yaml}
  mounts:
  - path: /etc/redpanda-console-config.yaml
    source:
      type: string
      data: |-
        #pt-clj (let [brokers (clojure.string/join
                       (map
                       (fn
                       [{:keys [host port]}]
                       (str host \: port))
                       (:brokers params)))]
          (str
           "kafka:\n"
           "  brokers: [\""
           brokers
           "\"]\n"
           "server:\n"
           "  listenPort: "
           (:port params)
           "\n"
           (when-let [url (:schema-registry-url params)]
            (str
             "  schemaRegistry:\n"
             "    enabled: true\n"
             "    urls: [\""
             url
             "\"]\n"))
           (when-let [url (:admin-url params)]
            (str
             "redpanda:\n"
             "  adminApi:\n"
             "    enabled: true\n"
             "    urls: [\""
             url
             "\"]\n"))
           "logger:\n"
           "  level: "
           (:log-level params)
           "\n"))
  restart: pt.param restart
  services:
  - id: redpanda-console
    ports:
    - {port: pt.param port, protocol: http}
```

## Description

This module provides the Redpanda Console, a web-based UI for managing and monitoring Kafka/Redpanda clusters. It offers features like topic management, consumer group monitoring, schema registry integration, and message browsing.

## Parameters

- **image**: The Docker image to use (default: `docker.redpanda.com/redpandadata/console:v2.4.5`)
- **container-id**: Container identifier (default: `redpanda-console`)
- **brokers**: List of broker host-port pairs to connect to (default: `[{host: redpanda, port: 9092}]`)
- **schema-registry-url**: Optional Schema Registry URL for schema management
- **admin-url**: Optional Redpanda admin API URL for enhanced features
- **log-level**: Logging level (debug, info, warn, error, fatal - default: info)
- **port**: HTTP port for the console (default: 8079)
- **restart**: Container restart policy (default: always restart)

## Services

The module exposes:

- **redpanda-console** (configurable port, default 8079): Web UI for cluster management

## Usage Example

```yaml
modules:
  - id: console
    module: polytope/redpanda!console
    args:
      brokers:
        - host: redpanda
          port: 9092
      schema-registry-url: "http://redpanda:8081"
      admin-url: "http://redpanda:9644"
      port: 8080

templates:
  - id: redpanda-stack
    run:
      - redpanda
      - console
