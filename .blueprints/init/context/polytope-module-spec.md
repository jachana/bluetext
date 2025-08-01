Example of a Polytope `init` module config:
```yaml
modules:
  - id: init
    info: Initializes modules that need to be initialized by an external service, potentially with configuration that may differ across environments.
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
        - { path: /conf/init, source: { type: host, path: ./init } }
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache } }
```
