# Documentation on how to use Couchbase in Polytope

## Latest docker image
Use the latest Couchbase server image: "couchbase:enterprise-7.6.6"

## Needs to be initialized before use
Couchbase needs to be initialized. This can be done by running the cillers-init module. Include the cillers-init module in the template that runs the Couchbase module.

It can take up to 10 minutes for Couchbase to be initialized on the first run depending on the machine it is running on. Code that depends on Couchbase being up and running therefore needs to have long connection retry periods.

## Testing that the connection is working
Python: bucket.ping()

## Cache the connection
Cache the connection to Couchbase so you don't need to reestablish it for each action. 

No need to cache the scope or collection. 

## How to store data in Couchbase
Document id: the document id is stored as the key to the document. No need to include it in the document itself.

Document type: this is determined by which collection the document is stored in. No need to include it in the document itself.

Documents are stored in collections. Ensure that you are storing each document in the correct collection. 

## Instructions for setting up the Couchbase init app
When running a couchbase module you also need to run the cillers-init module for initialization. 

**See cillers-init.md for complete setup instructions.**

### Couchbase-specific configuration
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
        - { name: INIT_SERVICES, value: couchbase }
        - { name: COUCHBASE_HOST, value: pt.value couchbase_host }
        - { name: COUCHBASE_USERNAME, value: pt.secret couchbase_username }
        - { name: COUCHBASE_PASSWORD, value: pt.secret couchbase_password }
        - { name: COUCHBASE_TLS, value: pt.value couchbase_tls }
      mounts:
        - { path: /conf/init, source: { type: host, path: ./conf/init } }
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache } }
</code>

### Required Configuration Files

#### ./conf/init/couchbase.yaml
Configure buckets, scopes, and collections with environment-specific settings, e.g.:

<file path="./conf/init/couchbase.yaml">
bucket_defaults:  # For all buckets
  ram_quota_mb: 100
  bucket_type: couchbase
  num_replicas: 0
  flush_enabled: false
  conflict_resolution_type: sequence_number
  eviction_policy: value_only
  compression_mode: off

collection_defaults:  # For all collections
  max_ttl: 0  # seconds

buckets:
  app_data:
    defaults:  # Per-bucket defaults across envs
      flush_enabled: true
      compression_mode: passive
    env_settings:
      dev:
        ram_quota_mb: 100
        num_replicas: 0
      test:
        ram_quota_mb: 150
        num_replicas: 1
      staging:
        ram_quota_mb: 500
        num_replicas: 2
        flush_enabled: false
        eviction_policy: full_eviction
        compression_mode: active
      prod:
        ram_quota_mb: 2048
        num_replicas: 3
        flush_enabled: false
        eviction_policy: full_eviction
        compression_mode: active
    scopes:
      user_scope:
        collections:
          users:
            defaults:  # Per-collection defaults across envs
              max_ttl: 3600
            env_settings:
              staging:
                max_ttl: 7200
              prod:
                max_ttl: 7200
          sessions: {}  # No settings; uses collection_defaults
      transaction_scope:
        collections:
          transactions: {}  # No settings
  logs_bucket:  # No settings; uses bucket_defaults
    scopes:
      _default:
        collections:
          _default: {}  # No settings; uses collection_defaults
</file>

**Configuration Structure:**
- `bucket_defaults`: Global settings applied to all buckets
- `collection_defaults`: Global settings applied to all collections
- `buckets`: Define specific buckets with their scopes and collections
- `defaults`: Per-bucket/collection defaults across all environments
- `env_settings`: Environment-specific overrides (dev, test, staging, prod)
- Empty objects `{}` inherit from global defaults















# Documentation on how to use Couchbase in Polytope

## Latest docker image
Use the latest Couchbase server image: "couchbase:enterprise-7.6.6"

## Running Couchbase

### Add the following code to the polytope.yml file

**Important: Make as few changes to the following as possible!**
<code type="yaml">
templates: 
  - id: stack
    run: 
      - couchbase

modules: 
  - id: couchbase
    module: polytope/couchbase
    args:
      image: couchbase:enterprise-7.6.6
      data-volume: { id: couchbase-data, type: volume, scope: project }
</code>

Create your own module that wraps `polytope/couchbase`: 
**DO NOT** run `polytope/couchbase` directly in templates - always use your wrapper module that includes the volume.

**IMPORTANT: Always create a wrapper module for Couchbase with a persistent volume!** Without a volume, all data will be lost when the container restarts.

Do not specify service ports for Couchbase unless the user specifically tells you to. 

## Testing that the connection is working
Python: bucket.ping()

## Cache the connection
Cache the connection to Couchbase so you don't need to reestablish it for each action. 

No need to cache the scope or collection. 

## How to store data in Couchbase
Document id: the document id is stored as the key to the document. No need to include it in the document itself.

Document type: this is determined by which collection the document is stored in. No need to include it in the document itself.

Documents are stored in collections. Ensure that you are storing each document in the correct collection. 

## Instructions for setting up the Couchbase init app
Make sure the init module is added. **IMPORTANT: Use the MCP server to fetch the init blueprint documentation. Use the `access_mcp_resource` tool with the server name `bluetext` and the URI `bluetext://blueprints/init`.**

The init module should be run by the templates that run the couchbase module. 

### Couchbase-specific configuration
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
        - { name: INIT_SERVICES, value: couchbase }
        - { name: COUCHBASE_HOST, value: pt.value couchbase_host }
        - { name: COUCHBASE_USERNAME, value: pt.secret couchbase_username }
        - { name: COUCHBASE_PASSWORD, value: pt.secret couchbase_password }
        - { name: COUCHBASE_TLS, value: pt.value couchbase_tls }
      mounts:
        - { path: /conf/init, source: { type: host, path: ./conf/init } }
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache } }
</code>

### Required Configuration Files

#### ./conf/init/couchbase.yaml
Configure buckets, scopes, and collections with environment-specific settings, e.g.:

<file path="./conf/init/couchbase.yaml">
bucket_defaults:  # For all buckets
  ram_quota_mb: 100
  bucket_type: couchbase
  num_replicas: 0
  flush_enabled: false
  conflict_resolution_type: sequence_number
  eviction_policy: value_only
  compression_mode: off

collection_defaults:  # For all collections
  max_ttl: 0  # seconds

buckets:
  app_data:
    defaults:  # Per-bucket defaults across envs
      flush_enabled: true
      compression_mode: passive
    env_settings:
      dev:
        ram_quota_mb: 100
        num_replicas: 0
      test:
        ram_quota_mb: 150
        num_replicas: 1
      staging:
        ram_quota_mb: 500
        num_replicas: 2
        flush_enabled: false
        eviction_policy: full_eviction
        compression_mode: active
      prod:
        ram_quota_mb: 2048
        num_replicas: 3
        flush_enabled: false
        eviction_policy: full_eviction
        compression_mode: active
    scopes:
      user_scope:
        collections:
          users:
            defaults:  # Per-collection defaults across envs
              max_ttl: 3600
            env_settings:
              staging:
                max_ttl: 7200
              prod:
                max_ttl: 7200
          sessions: {}  # No settings; uses collection_defaults
      transaction_scope:
        collections:
          transactions: {}  # No settings
  logs_bucket:  # No settings; uses bucket_defaults
    scopes:
      _default:
        collections:
          _default: {}  # No settings; uses collection_defaults
</file>

**Configuration Structure:**
- `bucket_defaults`: Global settings applied to all buckets
- `collection_defaults`: Global settings applied to all collections
- `buckets`: Define specific buckets with their scopes and collections
- `defaults`: Per-bucket/collection defaults across all environments
- `env_settings`: Environment-specific overrides (dev, test, staging, prod)
- Empty objects `{}` inherit from global defaults
