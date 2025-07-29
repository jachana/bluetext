# Documentation on how to use Redpanda in Polytope

## Running Redpanda

**IMPORTANT: Always create a wrapper module for Redpanda with a persistent volume!** Without a volume, all data will be lost when the container restarts.

A single-node redpanda cluster MUST be set up with persistent storage. Create your own module that wraps `polytope/redpanda`:

This can be called as-is (defaults are sensible), but for persistent state you should also create a volume for the data:
```yaml
modules:
  - id: redpanda
    info: Redpanda server with persistent storage
    module: polytope/redpanda
    args:
      data-volume:
        type: volume
        scope: project
        id: redpanda-data

```
modules:
  - id: redpanda
    module: polytope/redpanda
    args:
      data-volume:
          type: volume
          id: redpanda-data

  - id: rpk
    module: polytope/container
    params: [{id: cmd, type: str}]
    args:
      image: docker.redpanda.com/redpandadata/redpanda:v23.3.11
      env: [{ name: RPK_BROKERS, value: "{pt.value redpanda-host}:{pt.value redpanda-port}" }]
      cmd: pt.param cmd
      restart:
        policy: on-failure

**DO NOT** run `polytope/redpanda` directly in templates - always use your wrapper module that includes the volume.

### Running Redpanda Console

Please run the `polytope/redpanda!console` module together with the redpanda server.

This defaults to connecting to the redpanda server running via `polytope/redpanda`, so there's no need to specify any args. Don't try to create a module wrapping this, you'll just trip yourself up.

