# Documentation For The Redpanda Console Blueprint

This Blueprint specifies how to add and update a Redpanda Console module.

Parend module: `polytope/redpanda!console`. Read the bluetext documentation resource for this standard module to understand how to specify the `args` attributes.

## `polytope.yml` Configuration

```yaml
  - id: redpanda-console
    info: "Redpanda Console web UI (blueprint: redpanda-console)"
    module: redpanda-console-base
    args:
      port: pt.values redpanda-console-port
      redpanda-port: pt.values redpanda-port

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
        - host: pt.value redpanda-host
          port: "#pt-clj (Integer/parseInt (:redpanda-port params))"
      admin-url: "http://{pt.value redpanda-host}:9644"
      port: "#pt-clj (Integer/parseInt (:port params))"
```
