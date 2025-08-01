# Cillers Init Module Documentation

The cillers-init module is a containerized initialization service that manages Couchbase and Redpanda infrastructure setup automatically.

## Overview

The cillers-init image handles:
- Couchbase cluster initialization
- Bucket, scope, and collection management
- Redpanda topic creation and configuration
- Environment-specific configuration management
- Connection handling and retry logic

## Docker Image

The published Docker image is available at:
```
us-central1-docker.pkg.dev/arched-inkwell-420116/cillers-repo/cillers-init:latest
```

## Basic Configuration

### Add to polytope.yml

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
        - { name: INIT_SERVICES, value: pt.value init_services }
        # Service-specific environment variables (see service documentation)
      mounts:
        - { path: /conf/init, source: { type: host, path: ./conf/init } }
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache } }
</code>

## Environment Variables

### Required
- `ENVIRONMENT`: The target environment (must be defined in env.yaml)
- `INIT_SERVICES`: Comma-separated list of services to initialize (e.g., "couchbase", "redpanda", "couchbase,redpanda")

### Service-Specific
See individual service documentation for additional required environment variables:
- Couchbase: COUCHBASE_HOST, COUCHBASE_USERNAME, COUCHBASE_PASSWORD, COUCHBASE_TLS
- Redpanda: REDPANDA_HOST, REDPANDA_PORT


### Service-Specific Configuration Files
- `./conf/init/couchbase.yaml`: Bucket, scope, and collection definitions (see couchbase.md)
- `./conf/init/redpanda.yaml`: Topic definitions and configurations (see redpanda.md)
