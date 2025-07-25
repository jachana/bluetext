# Documentation on how to use Redpanda in Polytope

## Running Redpanda

A single-node redpanda cluster can be set up by just running the `polytope/redpanda` module.

This can be called as-is (defaults are sensible), but for persistent state you should also create a volume for the data:
```yaml
modules:
  - id: redpanda
    module: polytope/redpanda
    args:
      data-volume:
          type: volume
          id: redpanda-data
```

### Running Redpanda Console

Please run the `polytope/redpanda!console` module together with the redpanda server.

This defaults to connecting to the redpanda server running via `polytope/redpanda`, so there's no need to specify any args. Don't try to create a module wrapping this, you'll just trip yourself up.

### Creating topics

There's no built-in module for creating topics. Please include the following modules verbatim to create topics:
```yaml
  - id: rpk
    module: polytope/container
    params: [{id: cmd, type: str}]
    args:
      image: docker.redpanda.com/redpandadata/redpanda:v23.3.11
      env: [{ name: RPK_BROKERS, value: "{pt.value redpanda-host}:{pt.value redpanda-port}" }]
      cmd: pt.param cmd
      restart:
        policy: on-failure

  - id: create-topics
    params:
      - id: topics
        type: [default, str, messages]
        info: Space-separated list of topics to create
    module: rpk
    args:
      cmd: "topic create {pt.value redpanda-topics}"
```

## Pulling it all together

A basic setup could look as follows:
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

  - id: create-topics
    params:
      - id: topics
        type: [default, str, messages]
        info: Space-separated list of topics to create
    module: rpk
    args:
      cmd: "topic create {pt.value redpanda-topics}"

# ...

templates:
  - id: stack
    info: Complete stack with React frontend, FastAPI backend, Redpanda server and console
    run:
      - redpanda
      - polytope/redpanda!console
      - create-topics
      # ...
```

## For any Python code that accesses redpanda
Use the kafka-python package. Version: 2.2.15