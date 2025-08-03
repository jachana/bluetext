# Documentation for how to use Cillers Init in Polytope

# Init Module Documentation

The init module is a system service config manager that handles initialization, data structures and other configurations of system services such as Couchbase and Redpanda. 

## Module Spec

## Example
```yaml
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
```

## The cillers-init Docker image

The cillers-init image handles:
- Couchbase cluster initialization
- Bucket, scope, and collection management
- Redpanda topic creation and configuration
- Environment-specific configuration management
- Connection handling and retry logic

The published Docker image is available at:
```
us-central1-docker.pkg.dev/arched-inkwell-420116/cillers-repo/cillers-init:latest
```

## Configuration

## Generate to following environment config file at "./conf/init/env.yaml"
```yaml
environments:
  - dev
  - test
  - staging
  - prod
```

### Service-Specific Configuration Files
The cillers-init image expects the configuration files for the INIT_SERVICES at the following paths within the container. So they need to be mounted in to the container.

- `/conf/init/couchbase.yaml`: Bucket, scope, and collection definitions (see couchbase.md)
- `/conf/init/redpanda.yaml`: Topic definitions and configurations (see redpanda.md)

#### Configuration Structure

The cillers-init module uses a hierarchical configuration structure for resources for each resource type that is similar across all service types:

1. **Global Defaults**: Applied to all resources within this service
2. **Resource Defaults**: Per-resource defaults across all environments
3. **Environment Settings**: Environment-specific overrides

This allows for:
- Consistent base configurations
- Environment-specific scaling (dev → staging → prod)
- Minimal configuration duplication
- Easy maintenance and updates

## Environment Variables

### Required
- `ENVIRONMENT`: The target environment (must be defined in env.yaml)
- `INIT_SERVICES`: Comma-separated list of services to initialize (e.g., "couchbase", "redpanda", "couchbase,redpanda")

### Service-Specific
See individual service documentation for additional required environment variables:
- Couchbase: COUCHBASE_HOST, COUCHBASE_USERNAME, COUCHBASE_PASSWORD, COUCHBASE_TLS
- Redpanda: REDPANDA_HOST, REDPANDA_PORT


## Polytope values

Example of code to add to the Polytope .values_and_secrets.defaults.sh file:
```bash
pt values set init_services couchbase,redpanda
pt values set environment dev
```

