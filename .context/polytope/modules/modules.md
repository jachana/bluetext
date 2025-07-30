This file contains module definitions for some built-in Polytope modules. Use these if you can.

# polytope/redpanda

```yml
info: Runs a single Redpanda node in dev mode.
id: redpanda
params:
- id: image
  info: The container image to use.
  name: Container Image
  type: [default, str, 'docker.redpanda.com/redpandadata/redpanda:v23.3.11']
- id: data-volume
  info: Volume to use for data.
  name: Data Volume
  type: [maybe, mount-source]
- id: log-level
  info: The default log level.
  name: Log level
  type:
  - default
  - [enum, trace, debug, info, warn, error]
  - info
- id: restart
  info: Restart policy for the containers.
  name: Restart policy
  type:
  - default
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
  - {policy: always, max-restarts: null}
module: polytope/container
args:
  id: redpanda
  image: pt.param image
  restart: pt.param restart
  cmd:
  - redpanda
  - start
  - --kafka-addr=0.0.0.0:9092
  - --advertise-kafka-addr=redpanda:9092
  - --pandaproxy-addr=0.0.0.0:8082
  - --advertise-pandaproxy-addr=redpanda:8082
  - --rpc-addr=0.0.0.0:33145
  - --advertise-rpc-addr=redpanda:33145
  - --schema-registry-addr=0.0.0.0:8081
  - --mode=dev-container
  - --smp=1
  - "--default-log-level={pt.param log-level}"
  mounts: |-
    #pt-clj (when-let [v (:data-volume params)]
      [{:path "/var/lib/redpanda/data", :source v}])
  services:
  - id: redpanda
    ports:
    - {port: 9092, protocol: tcp, label: kafka}
    - {port: 8082, protocol: http, label: pandaproxy}
    - {port: 8081, protocol: http, label: schema-registry}
    - {port: 9644, protocol: http, label: admin-api}
    - {port: 33145, protocol: tcp, label: rpc}
```

# polytope/redpanda!console

```yml
info: Runs the Redpanda console.
id: console
params:
- id: image
  info: The image to use.
  name: Image
  type: [default, str, 'docker.redpanda.com/redpandadata/console:v2.4.5']
- id: container-id
  info: The ID to give the spawned container.
  name: Container ID
  type: [default, str, redpanda-console]
- id: brokers
  info: List of host-port pairs to use to connect to the Kafka/Redpanda cluster.
  name: Brokers
  type:
  - default
  - - {host: str, port: int}
  - - {host: redpanda, port: 9092}
- id: schema-registry-url
  info: Schema Registry to connect to.
  name: Schema Registry URL
  type: [maybe, str]
- id: admin-url
  info: Redpanda admin URL to connect to.
  name: Redpanda admin URL
  type: [maybe, str]
- id: log-level
  info: The log level.
  name: Log level
  type:
  - default
  - [enum, debug, info, warn, error, fatal]
  - info
- id: port
  info: The console HTTP port.
  name: HTTP Port
  type: [default, int, 8079]
- id: restart
  info: Restart policy for the container.
  name: Restart policy
  type:
  - default
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
  - {policy: always, max-restarts: null}
module: polytope/container
args:
  image: pt.param image
  id: pt.param container-id
  env:
  - {name: CONFIG_FILEPATH, value: /etc/redpanda-console-config.yaml}
  mounts:
  - path: /etc/redpanda-console-config.yaml
    source:
      type: string
      data: |-
        #pt-clj (let [brokers (clojure.string/join
                       (map
                       (fn
                       [{:keys [host port]}]
                       (str host \: port))
                       (:brokers params)))]
          (str
           "kafka:\n"
           "  brokers: [\""
           brokers
           "\"]\n"
           "server:\n"
           "  listenPort: "
           (:port params)
           "\n"
           (when-let [url (:schema-registry-url params)]
            (str
             "  schemaRegistry:\n"
             "    enabled: true\n"
             "    urls: [\""
             url
             "\"]\n"))
           (when-let [url (:admin-url params)]
            (str
             "redpanda:\n"
             "  adminApi:\n"
             "    enabled: true\n"
             "    urls: [\""
             url
             "\"]\n"))
           "logger:\n"
           "  level: "
           (:log-level params)
           "\n"))
  restart: pt.param restart
  services:
  - id: redpanda-console
    ports:
    - {port: pt.param port, protocol: http}

```

# polytope/redpanda!connect

```yml
info: Runs Redpanda connect.
id: connect
params:
- id: image
  info: The image to use.
  name: Image
  type: [default, str, docker.redpanda.com/redpandadata/connect]
- id: container-id
  info: The ID to give the spawned container.
  name: Container ID
  type: [default, str, redpanda-connect]
- {id: config-file, info: Redpanda connect config file., name: Config file, type: mount-source}
- id: restart
  info: Restart policy for the container.
  name: Restart policy
  type:
  - default
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
  - {policy: always, max-restarts: null}
- id: port
  info: The console HTTP port.
  name: HTTP Port
  type: [default, int, 4195]
module: polytope/container
args:
  image: pt.param image
  id: pt.param container-id
  mounts:
  - {path: /connect.yaml, source: pt.param config-file}
  restart: pt.param restart
  services:
  - id: redpanda-connect
    ports:
    - {port: pt.param port, protocol: http}
```

# polytope/postgres

```yml
info: Runs a PostgreSQL container.
id: postgres
params:
- id: image
  info: The Docker image to run.
  name: Image
  type: [default, docker-image, 'public.ecr.aws/docker/library/postgres:16.2']
- id: container-id
  info: The ID to use for the container.
  name: Container ID
  type: [default, str, postgres]
- id: data-volume
  name: Data Volume
  info: The volume (if any) to mount for data.
  type: [maybe, mount-source]
- id: service-id
  info: The ID to use for the service.
  name: Service ID
  type: [default, str, postgres]
- id: env
  info: Environment variables to pass to the server.
  name: Environment variables
  type:
  - maybe
  - [env-var]
- id: cmd
  info: The command to run in the container. If unspecified, runs the PostgreSQL server.
  name: Command
  type:
  - maybe
  - - either
    - str
    - - [maybe, str]
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
- id: scripts
  info: SQL files to run when initializing the DB.
  name: Scripts
  type:
  - maybe
  - [mount-source]
module: polytope/container
args:
  image: pt.param image
  id: pt.param container-id
  mounts: |-
    #pt-clj (concat
     (when-let [v (:data-volume params)]
      [{:path "/var/lib/postgresql/data", :source v}])
     (for [s (:scripts params)]
      {:path   "/docker-entrypoint-initdb.d/data-backup.sql"
       :source s}))
  env: pt.param env
  tty: '#pt-clj (empty? (:scripts params))'
  restart: pt.param restart
  services:
  - id: pt.param service-id
    ports:
    - {protocol: tcp, port: 5432}
```

# polytope/postgres!simple

```yml
info: Runs a PostgreSQL container with minimal configuration.
id: simple
params:
- id: image
  info: The Docker image to run.
  name: Image
  type: [default, docker-image, 'postgres:15.4']
- id: scripts
  info: SQL files to run when initializing the DB.
  name: Scripts
  type:
  - maybe
  - [mount-source]
- id: data-volume
  name: Data Volume
  info: The volume (if any) to mount for data.
  type: [maybe, mount-source]
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
module: polytope/container
args:
  image: pt.param image
  id: pt.param id
  mounts: |-
    #pt-clj (concat
     (when-let [v (:data-volume params)]
      [{:path "/var/lib/postgresql/data", :source v}])
     (for [s (:scripts params)]
      {:path   "/docker-entrypoint-initdb.d/data-backup.sql"
       :source s}))
  env:
  - {name: POSTGRES_HOST_AUTH_METHOD, value: trust}
  tty: '#pt-clj (empty? (:scripts params))'
  restart: pt.param restart
  services:
  - id: postgres
    ports:
    - {protocol: tcp, port: 5432}
```

# polytope/python

```yml
info: Runs a Python container.
id: python
params:
- id: image
  info: The container image to use.
  name: Image
  type: [default, str, 'public.ecr.aws/docker/library/python:3.12.2-slim-bookworm']
- id: code
  info: Optional source code directory to mount into the container.
  name: Code
  type: [maybe, mount-source]
- id: cmd
  info: The command to run. Runs a Python shell if left blank.
  name: Command
  type:
  - maybe
  - - either
    - str
    - [str]
- id: env
  info: Environment variables for the container.
  name: Environment variables
  type:
  - maybe
  - - [maybe, env-var]
- id: requirements
  info: Optional requirements.txt file to install before running the command.
  name: Requirements file
  type: [maybe, mount-source]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - [service-spec]
- id: id
  info: The container's ID/name.
  name: ID
  type: [maybe, id]
- id: mounts
  info: Additional files or directories to mount into the container.
  name: Mounts
  type:
  - maybe
  - - - maybe
      - {source: mount-source, path: absolute-path}
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
module: polytope/container
args:
  cmd: |-
    #pt-clj (if (:requirements params)
      (if (or
           (nil? (:cmd params))
           (string? (:cmd params)))
        (str
         "sh -c 'pip install -r /requirements.txt; "
         (or (:cmd params) "python")
         "'")
        (str
         "sh -c 'pip install -r /requirements.txt; "
         (str/join " " (:cmd params))
         "'"))
      (:cmd params))
  env: pt.param env
  services: pt.param services
  id: pt.param id
  image: pt.param image
  mounts: |-
    #pt-clj (vec
     (concat
     (when-let [code (:code params)]
      [{:path "/app", :source code}])
     (when-let [reqs (:requirements params)]
      [{:path "/requirements.txt", :source reqs}])
     (:mounts params)))
  restart: pt.param restart
  workdir: /app
```

# polytope/python!simple

```yml
info: Runs a Python container with minimal configuration.
id: simple
params:
- id: code
  info: Optional source code directory to mount into the container.
  name: Code
  type: [maybe, mount-source]
- id: cmd
  info: The command to run. Runs a Python shell if left blank.
  name: Command
  type: [maybe, str]
- id: env
  info: Environment variables for the container.
  name: Environment variables
  type:
  - maybe
  - [env-var]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - - {id: str, port: int}
module: polytope/container
args:
  cmd: pt.param cmd
  env: pt.param env
  services: |-
    #pt-clj (map
     (fn
     [{:keys [id port]}]
     {:id    id
     :ports [{:port port, :protocol :http}]})
     (:services params))
  image: python:3.11
  update-image: false
  mounts: |-
    #pt-clj (vec
     (concat
     (when-let [code (:code params)]
      [{:path "/app", :source code}])
     (when-let [reqs (:requirements params)]
      [{:path "/requirements", :source reqs}])))
  workdir: /app
```

# polytope/container

```yml
info: Runs a Docker container.
id: container
params:
- {id: image, info: The Docker image to run., name: Image, type: docker-image}
- id: id
  info: The container's ID/name.
  name: ID
  type: [maybe, id]
- id: cmd
  info: The command to run in the container.
  name: Command
  type:
  - maybe
  - - either
    - str
    - - [maybe, str]
- id: mounts
  info: Code or files to mount into the container.
  name: Mounts
  type:
  - maybe
  - - - maybe
      - {source: mount-source, path: absolute-path}
- id: env
  info: Environment variables for the container.
  name: Environment variables
  type:
  - maybe
  - - [maybe, env-var]
- id: workdir
  info: The container's working directory.
  name: Working directory
  type: [maybe, absolute-path]
- id: entrypoint
  info: The container's entrypoint.
  name: Entrypoint
  type:
  - maybe
  - - either
    - str
    - - [maybe, str]
- id: no-stdin
  info: Whether to keep the container's stdin closed.
  name: Non-interactive
  type: [default, bool, false]
- id: tty
  info: Whether to allocate a pseudo-TTY for the container.
  name: TTY
  type: [default, bool, true]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - [service-spec]
- id: datasets
  info: Paths in the container to store as datasets upon termination.
  name: Datasets
  type:
  - maybe
  - - {path: absolute-path, sink: dataset-sink}
- id: user
  info: The user (name or UID) to run commands in the container as.
  name: User
  type:
  - maybe
  - [either, int, str]
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy:
    - maybe
    - [enum, never, always, on-failure]
    max-restarts: [maybe, int]
- id: scaling
  info: How many replicas to create.
  name: Replicas
  type: [maybe, int]
- id: update-image
  info: Image update policy.
  name: Update image
  type: [default, bool, false]
- id: instance-type
  info: The instance type to run the container on.
  name: Instance type
  type: [maybe, instance-type]
- id: resources
  info: The resources to allocate for the container.
  name: Resources
  type:
  - maybe
  - cpu:
      request: [maybe, num]
      limit: [maybe, num]
    memory:
      request: [maybe, data-size]
      limit: [maybe, data-size]
code: |-
  #pt-clj (let [spec (merge
              (dissoc params :services :datasets)
              (when-let [replicas (:scaling params)]
               {:scaling {:replicas replicas, :type "manual"}}))
        id   (pt/spawn spec)]
    (pt/await-started
     {:ref id, :type "deployment"})
    (doseq [service (:services params)]
      (pt/open-service service))
    (let [exit-code (pt/await-done
                     {:ref id, :type "deployment"})]
      (when (not= 0 exit-code)
        (pt/fail
         "The container exited with a nonzero exit code."
         {:exit-code exit-code})))
    (doseq [{:keys [path sink]} (:datasets params)]
      (pt/store-dataset
       {:container-id id
       :path         path
       :type         "container-path"}
       sink)))
```

# polytope/node

```yml
info: Runs a Node.js container.
id: node
params:
- id: image
  info: The container image to use.
  name: Image
  type: [default, str, 'public.ecr.aws/docker/library/node:21.7.0-slim']
- id: code
  info: Optional source code directory to mount into the container.
  name: Code
  type: [maybe, mount-source]
- id: cmd
  info: The command to run. Runs a Node shell if left blank.
  name: Command
  type:
  - maybe
  - - either
    - str
    - [str]
- id: env
  info: Environment variables for the container.
  name: Environment variables
  type:
  - maybe
  - - name: str
      value: [either, str, int, bool]
- id: id
  info: The container's ID/name.
  name: ID
  type: [maybe, id]
- id: package
  info: Optional package.json file to install before running the command.
  name: Package file
  type: [maybe, mount-source]
- id: mounts
  info: Additional files or directories to mount into the container.
  name: Mounts
  type:
  - maybe
  - - - maybe
      - {source: mount-source, path: absolute-path}
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
- id: services
  info: Ports in the container to expose as services.
  name: Services
  type:
  - maybe
  - [service-spec]
module: polytope/container
args:
  cmd: |-
    #pt-clj (if (:package params)
      (if (or
           (nil? (:cmd params))
           (string? (:cmd params)))
        (str
         "sh -c 'npm install /package.json; "
         (or (:cmd params) "node")
         "'")
        (str
         "sh -c 'npm install /package.json; "
         (str/join " " (:cmd params))
         "'"))
      (:cmd params))
  env: pt.param env
  services: pt.param services
  image: pt.param image
  id: pt.param id
  mounts: |-
    #pt-clj (vec
     (concat
     (when-let [code (:code params)]
      [{:path "/app", :source code}])
     (when-let [reqs (:package params)]
      [{:path "/package.json", :source reqs}])
     (:mounts params)))
  restart: pt.param restart
  workdir: /app
```
