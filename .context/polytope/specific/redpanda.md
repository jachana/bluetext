# Documentation on how to use Redpanda in Polytope

## Instructions for setting up the Redpanda server

### Add the following code verbatim to the polytope.yml file

```yaml
  - id: redpanda
    module: polytope/redpanda
    args:
      data-volume: { id: redpanda-data, type: volume, scope: project }

  - id: rpk
    module: polytope/container
    params: [{id: cmd, type: str}]
    args:
      image: docker.redpanda.com/redpandadata/redpanda:v23.3.11
      env: [{ name: RPK_BROKERS, value: "{pt.value redpanda-host}:{pt.value redpanda-port}" }]
      cmd: pt.param cmd
      restart:
        policy: on-failure

  - id: redpanda-create-topics
    module: rpk
    args: 
      cmd: "topic create {pt.value redpanda-topics}"

  - id: redpanda-console
    info: Runs the Redpanda Console service
    module: polytope/redpanda!console
```

## For any Python code that accesses redpanda
Use the kafka-python package. Version: 2.2.15

## Topic migrations
Specify all topics that should exist as a space-separated pt-value string. 

Include the redpanda-create-topics module in the stack template to make sure that the topics are created. 
