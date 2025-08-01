# Cillers Init Module Documentation

The cillers-init module is a containerized initialization service that manages Couchbase and Redpanda infrastructure setup automatically.

## Overview
The cillers-init image handles:
- Couchbase cluster initialization
- Bucket, scope, and collection management
- Redpanda topic creation and configuration
- Environment-specific configuration management
- Connection handling and retry logic

## Environment Variables

### Required
- `ENVIRONMENT`: The target environment (must be defined in env.yaml)
- `INIT_SERVICES`: Comma-separated list of services to initialize (e.g., "couchbase", "redpanda", "couchbase,redpanda")

### Service-Specific
See individual blueprint context documentation for additional required environment variables:
- Couchbase: COUCHBASE_HOST, COUCHBASE_USERNAME, COUCHBASE_PASSWORD, COUCHBASE_TLS
- Redpanda: REDPANDA_HOST, REDPANDA_PORT

### Service-Specific Configuration Files
- `./init/couchbase.yaml`: Bucket, scope, and collection definitions (see couchbase.md)
- `./init/redpanda.yaml`: Topic definitions and configurations (see redpanda.md)

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
