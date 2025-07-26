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

## Required Configuration Files

The cillers-init module requires configuration files mounted at `/conf/init`:

### ./conf/init/env.yaml
Define the environments your application supports, e.g.:

<file path="./conf/init/env.yaml">
environments:
  - dev
  - test
  - staging
  - prod
</file>

### Service-Specific Configuration Files
- `./conf/init/couchbase.yaml`: Bucket, scope, and collection definitions (see couchbase.md)
- `./conf/init/redpanda.yaml`: Topic definitions and configurations (see redpanda.md)

## Configuration Structure

The cillers-init module uses a hierarchical configuration system:

1. **Global Defaults**: Applied to all resources of a type
2. **Resource Defaults**: Per-resource defaults across all environments
3. **Environment Settings**: Environment-specific overrides

This allows for:
- Consistent base configurations
- Environment-specific scaling (dev → staging → prod)
- Minimal configuration duplication
- Easy maintenance and updates

## Deployment Notes

- Include the init module in your template before the services it initializes
- The module will exit successfully after completing initialization
- Use `restart: { policy: on-failure, max-restarts: 3 }` for automatic retry on failures
- Configuration files are mounted read-only
- The module supports running multiple times safely (idempotent operations)
