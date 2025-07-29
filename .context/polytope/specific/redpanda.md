# Documentation on how to use Redpanda in Polytope

## Instructions for setting up the Redpanda server

### Add the following code verbatim to the polytope.yml file

<code type="yaml">
  - id: redpanda
    module: polytope/redpanda
    args:
      data-volume: { id: redpanda-data, type: volume, scope: project }

  - id: redpanda-console
    info: Runs the Redpanda Console service
    module: polytope/redpanda!console
  
</code>

## For any Python code that accesses redpanda
Use the kafka-python package. Version: 2.2.15. 

The requirements.txt file should not specify any other version than 2.2.15. 
kafka-python==2.2.15

You must check that no python code uses any other version of the kafka-python package.

## Topic initialization and management
Use the cillers-init module to create Redpanda topics. The required topics will not be created unless cillers-init is run. 

**See cillers-init.md for complete setup instructions.**

### Redpanda-specific configuration
<code type="yaml">
  - id: init
    info: Manages Redpanda topics and Couchbase buckets/scopes/collections
    module: polytope/container
    args:
      image: us-central1-docker.pkg.dev/arched-inkwell-420116/cillers-repo/cillers-init:latest
      id: init
      restart: { policy: on-failure, max-restarts: 3 }
      env:
        - { name: ENVIRONMENT, value: pt.value environment }
        - { name: INIT_SERVICES, value: redpanda }
        - { name: REDPANDA_HOST, value: pt.value redpanda_host }
        - { name: REDPANDA_PORT, value: pt.value redpanda_port }
      mounts:
        - { path: /conf/init, source: { type: host, path: ./conf/init } }
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache } }
</code>

### Required Configuration Files

#### ./conf/init/redpanda.yaml
Configure topics with environment-specific settings, e.g.:

<file path="./conf/init/redpanda.yaml">
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
</file>

**Configuration Structure:**
- `defaults`: Global settings applied to all topics
- `topics`: Define specific topics with their configurations
- `defaults` (per-topic): Per-topic defaults across all environments
- `env_settings`: Environment-specific overrides (dev, test, staging, prod)
- `config`: Kafka topic configuration parameters
- Empty objects `{}` inherit from global defaults

**Common Kafka Configuration Parameters:**
- `retention.ms`: Message retention time in milliseconds
- `cleanup.policy`: `delete` (time-based) or `compact` (log compaction)
- `segment.ms`: Time before a new segment is rolled
- `max.message.bytes`: Maximum message size

## Topic migrations
Define all topics that should exist in your configuration files mounted at `/conf/init`. The cillers-init module will automatically create and manage these topics based on your environment configuration.
