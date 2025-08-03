# Documentation on how to use Redpanda in Polytope

## Add the following code to the polytope.yml file

**Important: Make as few changes to the following as possible!**

<code type="yaml">
templates:
  - id: stack
  - run: 
    - redpanda-console

modules:
  - id: redpanda-console
    info: Redpanda Console web UI
    module: redpanda-console-base
    args:
      port: pt.values redpanda_console_port
      redpanda-port: pt.values redpanda_port

  - id: redpanda-console-base
    info: Redpanda Console web UI
    module: polytope/redpanda!console
    params:
      - id: port
        type: [default, str, "8080"]
      - id: redpanda-port
        type: [default, str, "9092"]
    args:
      brokers:
        - host: pt.value redpanda_host
          port: "#pt-js parseInt(params['redpandaPort'])"
      admin-url: "http://{pt.value redpanda_host}:9644"
      port: "#pt-js parseInt(params['port'])"

</code>

