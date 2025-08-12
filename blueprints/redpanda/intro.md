# Documentation For The Redpanda Blueprint

This Blueprint specifies how to add and update a Redpanda module for providing a Redpanda server as well as how to access the Redpanda server.

Parent module: `polytope/redpanda`. Read the bluetext documentation resource for this standard module to understand how to specify the `args` attributes.

## Example of a Polytope Redpanda module

```yaml
  - id: redpanda
    info: "Runs the Redpanda server (blueprint: redpanda)"
    module: polytope/redpanda
    args:
      image: docker.redpanda.com/redpandadata/redpanda:latest
      data-volume: { id: redpanda-data, type: volume, scope: project }
```

**IMPORTANT: Always create a wrapper module for Redpanda with a persistent volume!** Without a volume, all data will be lost when the container restarts.

## SDKs For Accessing Redpanda

### Python
Use the kafka-python package. Version: 2.2.15. If you try to use an older version, you will fail.

## Dependencies

### Values And Secrets

The following values should be defined: `redpanda-host` and `redpanda-port`. Do not hardcode these values in `polytope.yml`.

### Init Module

If you want to add or configure a topic, read the blueprint documentation resource for the `init` module. 

Make sure that the `init` module is added and runs as part of the same stack as the Redpanda module. If you try to add the `init` module without first reading its blueprint, you will fail.

If you try to add or configure a topic without first reading the `init` blueprint, you will fail.

The `REDPANDA_HOST` and `REDPANDA_PORT` values need to be added to the `init` modules `env` `args`. E.g.
```yaml
        - { name: REDPANDA_HOST, value: pt.value redpanda-host }
        - { name: REDPANDA_PORT, value: pt.value redpanda-port }
```

The `init` id for Redpanda is 'redpanda'. Make sure it is included in the `INIT_SERVICES` `env` `args`.

#### Configuration File

Topics should be configured with environment-specific settings in the `./conf/init/redpanda.yaml` file.

Configuration Specification:
- `defaults`: Global settings applied to all topics
- `topics`: Define specific topics with their configurations
- `topics.defaults` (per-topic): Per-topic defaults across all environments
- `topics.env_settings`: Environment-specific overrides (dev, test, staging, prod)
- `topics.env_settings.config`: Kafka topic configuration parameters
- Empty objects `{}` or missing attributes inherit from the defaults, where more specific defaults take precedence over more global. 

Common Kafka Configuration Parameters:
- `retention.ms`: Message retention time in milliseconds
- `cleanup.policy`: `delete` (time-based) or `compact` (log compaction)
- `segment.ms`: Time before a new segment is rolled
- `max.message.bytes`: Maximum message size

E.g. 

```yaml
defaults:  # Applies to all topics unless overridden
  partitions: 1
  replication: 1
  config:
    retention.ms: 86400000  # 1 day default

topics:
  orders:
    defaults:  # Per-topic defaults across all envs
      partitions: 3
      config:
        cleanup.policy: compact
    env_settings:
      staging:
        partitions: 6
        replication: 3
        config:
          cleanup.policy: delete
          retention.ms: 604800000  # 7 days
      prod:
        partitions: 12
        replication: 3
        config:
          cleanup.policy: delete
          retention.ms: 604800000
  logs: {}  # No settings; uses global defaults (partitions: 1, replication: 1, etc.)
```
