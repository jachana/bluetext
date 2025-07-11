# polytope/tensorboard
Module for running Tensorboard.

## tensorboard
Runs a Tensorboard instance.

### Parameters
- **image** (The Docker image to run.)  
  Name: Image  
  Type: [:default :docker-image "tensorflow/tensorflow:latest"]
- **logs** (Logs to use in the Tensorboard instance.)  
  Name: Logs  
  Type: :mount-source

Module: polytope/container  
Args: {:image (:image params), :mounts [{:source (:logs params), :path "/logs"}], :services [{:id :tensorboard, :ports [{:port 6006, :protocol :http}]}], :cmd ["tensorboard" "--logdir=/logs" "--bind_all"]}

# polytope/create-project
Modules for creating example projects. Meant to be used with the Polytope CLI to create examples to use locally.

## create-project (default)
Creates an example project from a template.

### Parameters
- **template** (Project template to copy)  
  Name: Template  
  Type: [:default [:enum "webapp" "ml-app" "chatbot"] "webapp"]
- **name** (Name for the new project directory)  
  Name: Name  
  Type: [:maybe :str]

Module: polytope/container  
Args: {:image "alpine/git", :cmd (let [dirname (str \" (str \" (or (:name params) (:template params)) \") \")] ["sh" "-c" (str "d=\"" dirname "\";" "if [ -e \"$d\" ]; then" "  printf \"\\e[33m\\e[1mWARNING:\\e[22m \\e[36m$d\\e[0m already exists.\\e[0m\\n\";" "  for i in $(seq 1 20); do if ! [ -e \"$d-$i\" ]; then d=\"$d-$i\"; break; fi; done;" "fi;" "printf \"Creating project at \\e[36m$d\\e[0m...\\n\";" "cp -r /template \"$d\" && git init -q --initial-branch=main \"/data/\"$d\"\";" "printf \"Done! Run \\e[35mcd \\\"$d\\\"\\e[0m to enter the project directory, then \\e[35mpt run stack\\e[0m to get started.\\e[0m\\n\"")]), :entrypoint [], :mounts [{:source {:type "repo", :repo pt/module-project-ref, :path (str \/ (:template params))}, :path "/template"} {:source {:type "host", :path "."}, :path "/data"}], :workdir "/data", :user "#pt-host"}

# polytope/postgres
Module for running PostgreSQL.

## postgres (default)
Runs a PostgreSQL container.

### Parameters
- **image** (The Docker image to run.)  
  Name: Image  
  Type: [:default :docker-image "public.ecr.aws/docker/library/postgres:16.2"]
- **container-id** (The ID to use for the container.)  
  Name: Container ID  
  Type: [:default :str "postgres-container"]
- **data-volume** (The volume (if any) to mount for data.)  
  Name: Data Volume  
  Type: [:maybe :mount-source]
- **service-id** (The ID to use for the service.)  
  Name: Service ID  
  Type: [:default :str "postgres"]
- **env** (Environment variables to pass to the server.)  
  Name: Environment variables  
  Type: [:maybe [:env-var]]
- **cmd** (The command to run in the container. If unspecified, runs the PostgreSQL server.)  
  Name: Command  
  Type: [:maybe [:either :str [[:maybe :str]]]]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]
- **scripts** (SQL files to run when initializing the DB.)  
  Name: Scripts  
  Type: [:maybe [:mount-source]]

Module: polytope/container  
Args: {:image (:image params), :id (:container-id params), :mounts (concat (when-let [v (:data-volume params)] [{:path "/var/lib/postgresql/data", :source v}]) (for [s (:scripts params)] {:source s, :path "/docker-entrypoint-initdb.d/data-backup.sql"})), :env (:env params), :tty (empty? (:scripts params)), :restart (:restart params), :services [{:id (:service-id params), :ports [{:protocol :tcp, :port 5432}]}]}

## simple
Runs a PostgreSQL container with minimal configuration.

### Parameters
- **image** (The Docker image to run.)  
  Name: Image  
  Type: [:default :docker-image "postgres:15.4"]
- **scripts** (SQL files to run when initializing the DB.)  
  Name: Scripts  
  Type: [:maybe [:mount-source]]
- **data-volume** (The volume (if any) to mount for data.)  
  Name: Data Volume  
  Type: [:maybe :mount-source]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]

Module: polytope/container  
Args: {:image (:image params), :id (:id params), :mounts (concat (when-let [v (:data-volume params)] [{:path "/var/lib/postgresql/data", :source v}]) (for [s (:scripts params)] {:source s, :path "/docker-entrypoint-initdb.d/data-backup.sql"})), :env [{:name "POSTGRES_HOST_AUTH_METHOD", :value "trust"}], :tty (empty? (:scripts params)), :restart (:restart params), :services [{:id "postgres", :ports [{:protocol :tcp, :port 5432}]}]}

## psql
Runs the PSQL shell.

### Parameters
- **hostname** (The PostgreSQL hostname to connect to.)  
  Name: Hostname  
  Type: :str
- **port** (The PostgreSQL port to connect to.)  
  Name: Port  
  Type: [:default :int 5432]
- **database** (The database name.)  
  Name: Database  
  Type: :str
- **username** (The PostgreSQL user.)  
  Name: Username  
  Type: :str
- **password** (The password for the given user.)  
  Name: Password  
  Type: :str
- **command** (The command to run. If unset, runs an interactive session.)  
  Name: Command  
  Type: [:maybe :str]

Module: postgres  
Args: {:env [{:name "PG_PASSWORD", :value (:password params)}], :cmd (->> ["psql" (str "--host=" (:hostname params)) (str "--user=" (:username params)) (str "--dbname=" (:database params)) (when (:command params) (str "--command=" (:command params)))] (remove nil?))}

# polytope/couchbase
Module for running Couchbase.

## couchbase (default)
Runs a Couchbase container.

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/docker/library/couchbase:community-7.2.4"]
- **id** (The ID of the container to spawn.)  
  Name: ID  
  Type: [:default :str "couchbase"]
- **cmd** (The command to run in the container. If unspecified, runs the Couchbase server.)  
  Name: Command  
  Type: [:maybe [:either :str [[:maybe :str]]]]
- **data-volume** (The volume (if any) to mount for data.)  
  Name: Data Volume  
  Type: [:maybe :mount-source]
- **services** (Ports to expose as services.)  
  Name: Services  
  Type: [:maybe [:service-spec]]
- **mounts** (Code or files to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [{:source :mount-source, :path :absolute-path}]]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]

Module: polytope/container  
Args: {:image (:image params), :id (:id params), :services (or (:services params) [{:id :couchbase, :ports [{:port 4369, :protocol :tcp, :label :epmd, :internal true} {:port 8091, :protocol :http, :label :http} {:port 8092, :protocol :http, :label :capi} {:port 8093, :protocol :http, :label :query} {:port 8094, :protocol :http, :label :fts} {:port 8095, :protocol :http, :label :cbas} {:port 8096, :protocol :http, :label :eventing} {:port 8097, :protocol :http, :label :backup} {:range "9100-9105", :protocol :tcp, :label :indexer, :internal true} {:range "9110-9122", :protocol :tcp, :label :analytics, :internal true} {:port 9123, :protocol :tcp, :label :prometheus} {:port 9124, :protocol :tcp, :label :backup-grpc, :internal true} {:port 9130, :protocol :tcp, :label :fts-grpc, :internal true} {:port 9140, :protocol :tcp, :label :eventing-debug, :internal true} {:port 9999, :protocol :tcp, :label :indexer, :internal true} {:port 11207, :protocol :tcp, :label :memcached-ssl} {:range "11209-11210", :protocol :tcp, :label :memcached} {:port 11280, :protocol :tcp, :label :memcached-prometheus} {:port 21100, :protocol :tcp, :label :cluster-management, :internal true} {:port 21150, :protocol :tcp, :label :cluster-management, :internal true} {:port 18091, :protocol :http, :label :http-ssl} {:port 18092, :protocol :http, :label :capi-ssl} {:port 18093, :protocol :http, :label :query-ssl} {:port 18094, :protocol :http, :label :fts-ssl} {:port 18095, :protocol :http, :label :cbas-ssl} {:port 18096, :protocol :http, :label :eventing-ssl} {:port 18097, :protocol :http, :label :backup-ssl}]}]), :cmd (when-let [c (:cmd params)] (if (string? c) c (remove nil? c))), :mounts (concat (when-let [v (:data-volume params)] [{:path "/opt/couchbase/var", :source v}]) (:mounts params)), :restart (:restart params)}

### Best practices

Couchbase needs to be initialized. This can be done by running the Couchbase init app. Include the Couchbase init app in the template that runs the Coachbase module.

Use the latest Couchbase server image: "couchbase:enterprise-7.6.6"

<code type="python">

</code>

## cli
Runs the Couchbase CLI

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/docker/library/couchbase:community-7.2.4"]
- **cmd** (The command to run.)  
  Name: Command  
  Type: [:either :str [[:maybe :str]]]
- **retries** (Number of times to retry on failure.)  
  Name: Retries  
  Type: [:maybe :int]

Module: couchbase  
Args: {:image (:image params), :id "couchbase-cli", :cmd (let [c (:cmd params)] (if (string? c) ["couchbase-cli" c] (into ["couchbase-cli"] c))), :restart (when-let [n (:retries params)] {:policy "on-failure", :max-restarts n}), :services []}

## init-cluster
Initializes a new cluster

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/docker/library/couchbase:community-7.2.4"]
- **cluster** (The cluster URL to connect to.)  
  Name: Cluster  
  Type: :str
- **username** (The cluster username to use.)  
  Name: Username  
  Type: :str
- **password** (The cluster password to use.)  
  Name: Password  
  Type: :str
- **services** (Services to expose.)  
  Name: Services  
  Type: [:default [:str] ["data" "index" "query"]]
- **ram** (Sets the RAM quota in MB for the data service of the cluster.)  
  Name: Cluster RAM size  
  Type: [:default :int 256]
- **index-ram** (Sets the RAM quota in MB for the index service of the cluster.)  
  Name: Index RAM size  
  Type: [:default :int 256]
- **eventing-ram** (Sets the RAM quota in MB for the eventing service of the cluster.)  
  Name: Eventing RAM size  
  Type: [:default :int 256]
- **fts-ram** (Sets the RAM quota in MB for the full-text search (FTS) service of the cluster.)  
  Name: FTS RAM size  
  Type: [:default :int 256]
- **retries** (Number of times to retry on failure.)  
  Name: Retries  
  Type: [:maybe :int]

Module: couchbase  
Args: {:image (:image params), :id "init-couchbase-cluster", :cmd (let [svc (set (:services params))] ["sh" "-c" (str "output=$(" (clojure.string/join " " ["couchbase-cli" "cluster-init" (str "--cluster=" (:cluster params)) (str "--cluster-username=" (:username params)) (str "--cluster-password=" (:password params)) (str "--services=" (clojure.string/join "," svc)) (when (svc "data") (str "--cluster-ramsize=" (:ram params))) (when (svc "index") (str "--cluster-index-ramsize=" (:index-ram params))) (when (svc "eventing") (str "--cluster-eventing-ramsize=" (:eventing-ram params))) (when (svc "fts") (str "--cluster-fts-ramsize=" (:eventing-ram params)))]) ") && echo \"$output\" || (echo \"$output\" | grep -q 'already initialized' && echo \"$output\" && exit 0 || echo \"$output\" && exit 1)")]), :restart (when-let [n (:retries params)] {:policy "on-failure", :max-restarts n}), :services []}

## create-bucket
Creates a bucket.

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/docker/library/couchbase:community-7.2.4"]
- **cluster** (The cluster URL to connect to.)  
  Name: Cluster  
  Type: :str
- **username** (Couchbase user.)  
  Name: Username  
  Type: :str
- **password** (The password for the given user.)  
  Name: Password  
  Type: :str
- **name** (Names the bucket to be created.)  
  Name: Bucket name  
  Type: :str
- **type** (Defines the type of the bucket.)  
  Name: Bucket type  
  Type: [:default :str "couchbase"]
- **ram** (Allocates RAM in MB to the bucket.)  
  Name: Bucket RAM size  
  Type: [:default :int 256]
- **retries** (Number of times to retry on failure.)  
  Name: Retries  
  Type: [:maybe :int]

Module: couchbase  
Args: {:image (:image params), :id "create-couchbase-bucket", :cmd (let [base (clojure.string/join " " [(str "--cluster=" (:cluster params)) (str "--username=" (:username params)) (str "--password=" (:password params))])] ["sh" "-c" (str "couchbase-cli bucket-list " base " | grep " (:name params) " || couchbase-cli bucket-create " base (str " --bucket=" (:name params)) (str " --bucket-type=" (:type params)) (str " --bucket-ramsize=" (:ram params)))]), :restart (when-let [n (:retries params)] {:policy "on-failure", :max-restarts n}), :services []}

## cbq
Runs CBQ against a Couchbase cluster.

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/docker/library/couchbase:community-7.2.4"]
- **cluster** (The cluster URL to connect to.)  
  Name: Cluster  
  Type: :str
- **username** (The Couchbase user.)  
  Name: Username  
  Type: :str
- **password** (The password for the given user.)  
  Name: Password  
  Type: :str
- **script** (The script or command to run. If unset, runs an interactive session.)  
  Name: Script  
  Type: [:maybe :str]
- **retries** (Number of times to retry on failure.)  
  Name: Retries  
  Type: [:maybe :int]

Module: couchbase  
Args: {:image (:image params), :id "cbq", :cmd (let [{u :username, p :password, c :cluster, s :script} params] ["sh" "-c" (->> [(when s (str "cat <<EOF > /tmp/s.n1ql\n" s "\nEOF")) (str "cbq -u " u " -p " p " -e " c " -exit-on-error " (when s " -f=/tmp/s.n1ql"))] (remove nil?) (clojure.string/join "\n"))]), :restart (when-let [n (:retries params)] {:policy "on-failure", :max-restarts n}), :services []}

# polytope/mailpit
Module for running Mailpit.

## mailpit (default)
Runs a Mailpit container.

### Parameters
- **image** (The container image to run.)  
  Name: Image  
  Type: [:default :str "axllent/mailpit:latest"]
- **id** (The ID to use for the container.)  
  Name: ID  
  Type: [:default :str "mailpit"]
- **data-volume** (The volume (if any) to mount for data.)  
  Name: Data Volume  
  Type: [:maybe :mount-source]
- **cmd** (The command to run in the container. If unspecified, runs the Mailpit server.)  
  Name: Command  
  Type: [:maybe [:either :str [[:maybe :str]]]]
- **env** (Environment variables to pass to the server.)  
  Name: Environment variables  
  Type: [:maybe [:env-var]]
- **mounts** (Code or files to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [{:source :mount-source, :path :absolute-path}]]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]
- **log-level** (The log level for the ID server.)  
  Name: Log level  
  Type: [:default :str "INFO"]

Module: polytope/container  
Args: {:image (:image params), :id (:id params), :env (concat (when (:data-volume params) [{:name "MP_DATA_FILE", :value "/data/mailpit.db"}]) (:env params)), :mounts (concat (when-let [v (:data-volume params)] [{:path "/data", :source v}]) (:mounts params)), :services [{:id :mailpit, :ports [{:port 1025, :protocol :tcp, :label :smtp} {:port 8025, :protocol :http, :label :ui}]}], :restart (:restart params), :cmd (:cmd params)}

# polytope/build-image
Module for building container images.

## build-image
Builds a container image.

### Parameters
- **tags** (Image tags to produce.)  
  Name: Tags  
  Type: [:str]
- **sources** (Data sources to include in the build.)  
  Name: Sources  
  Type: [{:source :mount-source, :path :absolute-path}]
- **dockerfile** (The Dockerfile to use for the build.)  
  Name: Dockerfile  
  Type: [:default :str "Dockerfile"]
- **labels** (Labels to include in the image.)  
  Name: Labels  
  Type: [:maybe {:str :str}]
- **target** (An (optional) target to build, for Dockerfiles that include multiple targets.)  
  Name: Target  
  Type: [:maybe :str]

Code: (let [build-id (pt/spawn-image-build params)] (pt/await-image-build build-id))

# polytope/nginx
Module for running Nginx.

## nginx
Runs Nginx.

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/nginx/nginx:1.25"]
- **id** (The ID to use for the container.)  
  Name: ID  
  Type: [:default :str "nginx"]
- **services** (The services to expose.)  
  Name: Services  
  Type: [:default [:service-spec] [{:id :nginx, :ports [{:port 80, :protocol :http}]}]]
- **mounts** (Code or files to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [{:source :mount-source, :path :absolute-path}]]

Module: polytope/container  
Args: {:image (str "nginx:" (:image params)), :id (:id params), :mounts (:mounts params), :services (:services params)}

# polytope/repl
Module that runs a read-eval-print loop (REPL) for interactively running
code against the runner API.

This is useful for experimentation, module development, and running ad-hoc
commands to accomplish tasks in jobs.

## repl (default)
Runs a REPL against the runner API.

Code: (loop [] (let [input-id (pt/request-user-input :code nil) cmd (:data (pt/await-user-input input-id))] (try (pt/log (pr-str (pt/eval cmd))) (catch Exception e (pt/log :error (str \` (ex-message e) \`)))) (recur)))

# polytope/send-slack-message
Module for sending messages to Slack.

## send-slack-message
Sends a message via a Slack webhook.

### Parameters
- **webhook** (The Slack webhook to send the message to.)  
  Name: Webhook URL  
  Type: [:regex "https://hooks.slack.com/services/[A-Z0-9]+/[A-Z0-9]+/[a-zA-Z0-9]+"]
- **text** (The message text to send.)  
  Name: Message text  
  Type: :str

Code: (pt/http-request {:url (:webhook params), :method :post, :body {:text (:text params)}})

# polytope/pulumi-cli
Module for running the Pulumi CLI.

## pulumi-cli
Runs the Pulumi CLI.

### Parameters
- **image** (The tag to use for the Pulumi container.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/pulumi/pulumi:3.109.0"]
- **command** (The command to run.)  
  Name: Command  
  Type: [:maybe :str]
- **access-token** (The access token to use.)  
  Name: Access token  
  Type: [:maybe :str]
- **env** (Additional environment variables.)  
  Name: Environment variables  
  Type: [:maybe [:env-var]]
- **mounts** (Code or files to mount into the Pulumi container.)  
  Name: Mounts  
  Type: [:default [{:source :mount-source, :path :absolute-path}] [{:source {:type "repo", :path "/"}, :path "/code"}]]
- **backend-url** (The Pulumi backend URL (for self-hosted Pulumi Cloud backends only).)  
  Name: Backend URL  
  Type: [:maybe :str]

Module: polytope/container  
Args: {:image (:image params), :id "pulumi-cli", :env (concat [{:name "PULUMI_ACCESS_TOKEN", :value (or (:access-token params) "unset")}] (:env params)), :mounts (:mounts params), :entrypoint "bash"}

# polytope/ngrok
Modules for running Ngrok.

## ngrok (default)
Runs an Ngrok container.

### Parameters
- **image** (The image to use.)  
  Name: Image  
  Type: [:default :str "ngrok/ngrok:3-alpine"]
- **env** (Environment variables to set.)  
  Name: Environment Variables  
  Type: [:env-var]
- **cmd** (The command to run in the container. If unspecified, runs the ID server.)  
  Name: Command  
  Type: [:either :str [[:maybe :str]]]
- **entrypoint** (Entrypoint for the container.)  
  Name: Entrypoint  
  Type: [:either :str [[:maybe :str]]]
- **mounts** (Code or files to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [{:source :mount-source, :path :absolute-path}]]

Module: polytope/container  
Args: {:image (:image params), :env (:env params), :mounts (:mounts params), :cmd (:cmd params), :entrypoint (:entrypoint params)}

## http
Runs the Ngrok agent http command.

### Parameters
- **host** (The host to forward traffic to.)  
  Name: Host  
  Type: :str
- **port** (The port to forward traffic to.)  
  Name: Port  
  Type: :int
- **config-files** (Ngrok agent configuration files.)  
  Name: Configuration files  
  Type: [:maybe [:mount-source]]
- **auth-token** (The auth token to use.)  
  Name: Auth token  
  Type: [:maybe :str]

Module: ngrok  
Args: {:cmd (->> ["http" "--log" "stdout" (when-let [token (:auth-token params)] ["--authtoken" token]) (for [i (range (count (:config-files params)))] ["--config" (str "/tmp/ngrok-" i ".yml")]) (str (:host params) \: (:port params))] flatten (remove nil?)), :mounts (for [[i f] (map-indexed vector (:config-files params))] {:source f, :path (str "/tmp/ngrok-" i ".yml")})}

# polytope/redpanda
Modules for running Redpanda.

## redpanda (default)
Runs a single Redpanda node in dev mode.

### Parameters
- **image** (The container image to use.)  
  Name: Container Image  
  Type: [:default :str "docker.redpanda.com/redpandadata/redpanda:v23.3.11"]
- **data-volume** (Volume to use for data.)  
  Name: Data Volume  
  Type: [:maybe :mount-source]
- **log-level** (The default log level.)  
  Name: Log level  
  Type: [:default [:enum "trace" "debug" "info" "warn" "error"] "info"]
- **restart** (Restart policy for the containers.)  
  Name: Restart policy  
  Type: [:default {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]} {:policy "always", :max-restarts nil}]

Module: polytope/container  
Args: {:id "redpanda", :image (:image params), :restart (:restart params), :cmd ["redpanda" "start" "--kafka-addr=0.0.0.0:9092" "--advertise-kafka-addr=redpanda:9092" "--pandaproxy-addr=0.0.0.0:8082" "--advertise-pandaproxy-addr=redpanda:8082" "--rpc-addr=0.0.0.0:33145" "--advertise-rpc-addr=redpanda:33145" "--schema-registry-addr=0.0.0.0:8081" "--mode=dev-container" "--smp=1" (str "--default-log-level=" (:log-level params))], :mounts (when-let [v (:data-volume params)] [{:path "/var/lib/redpanda/data", :source v}]), :services [{:id :redpanda, :ports [{:port 9092, :protocol :tcp, :label :kafka} {:port 8082, :protocol :http, :label :pandaproxy} {:port 8081, :protocol :http, :label :schema-registry} {:port 9644, :protocol :http, :label :admin-api} {:port 33145, :protocol :tcp, :label :rpc}]}]}

## console
Runs the Redpanda console.

### Parameters
- **image** (The image to use.)  
  Name: Image  
  Type: [:default :str "docker.redpanda.com/redpandadata/console:v2.4.5"]
- **container-id** (The ID to give the spawned container.)  
  Name: Container ID  
  Type: [:default :str "redpanda-console"]
- **brokers** (List of host-port pairs to use to connect to the Kafka/Redpanda cluster.)  
  Name: Brokers  
  Type: [:default [{:host :str, :port :int}] [{:host "redpanda", :port 9092}]]
- **schema-registry-url** (Schema Registry to connect to.)  
  Name: Schema Registry URL  
  Type: [:maybe :str]
- **admin-url** (Redpanda admin URL to connect to.)  
  Name: Redpanda admin URL  
  Type: [:maybe :str]
- **log-level** (The log level.)  
  Name: Log level  
  Type: [:default [:enum "debug" "info" "warn" "error" "fatal"] "info"]
- **port** (The console HTTP port.)  
  Name: HTTP Port  
  Type: [:default :int 8079]
- **restart** (Restart policy for the container.)  
  Name: Restart policy  
  Type: [:default {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]} {:policy "always", :max-restarts nil}]

Module: polytope/container  
Args: {:image (:image params), :id (:container-id params), :env [{:name "CONFIG_FILEPATH", :value "/etc/redpanda-console-config.yaml"}], :mounts [{:path "/etc/redpanda-console-config.yaml", :source {:type :string, :data (let [brokers (clojure.string/join (map (fn [{:keys [host port]}] (str host \: port)) (:brokers params)))] (str "kafka:\n" "  brokers: [\"" brokers "\"]\n" "server:\n" "  listenPort: " (:port params) "\n" (when-let [url (:schema-registry-url params)] (str "  schemaRegistry:\n" "    enabled: true\n" "    urls: [\"" url "\"]\n")) (when-let [url (:admin-url params)] (str "redpanda:\n" "  adminApi:\n" "    enabled: true\n" "    urls: [\"" url "\"]\n")) "logger:\n" "  level: " (:log-level params) "\n"))}}], :restart (:restart params), :services [{:id :redpanda-console, :ports [{:port (:port params), :protocol :http}]}]}

# polytope/kafka
Modules for running Kafka.

## kafka-kraft (default)
Runs a single Kafka node in KRaft mode.

### Parameters
- **image** (The Kafka image to use.)  
  Name: Kafka image  
  Type: [:default :str "confluentinc/cp-kafka:7.5.1"]
- **kafka-env** (Environment variables for Kafka.)  
  Name: Kafka environment variables  
  Type: [:maybe [:env-var]]
- **data-volume** (Volume to use for data.)  
  Name: Data volume  
  Type: [:maybe :mount-source]
- **root-log-level** (The Log4J root log level.)  
  Name: Root log level  
  Type: [:default [:enum "TRACE" "DEBUG" "INFO" "WARN" "ERROR" "FATAL" "OFF"] "INFO"]
- **restart** (Restart policy for the containers.)  
  Name: Restart policy  
  Type: [:default {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]} {:policy "always", :max-restarts nil}]

Module: polytope/container  
Args: {:id "kafka", :image (:image params), :restart (:restart params), :env (let [ll (:root-log-level params) loggers ["kafka.cluster.Partition" "kafka.controller" "kafka.coordinator.group.GroupCoordinator" "kafka.coordinator.group.GroupMetadata$" "kafka.coordinator.group.GroupMetadataManager" "kafka.coordinator.transaction.TransactionCoordinator" "kafka.coordinator.transaction.TransactionMarkerChannelManager" "kafka.log.LogCleaner" "kafka.log.LogCleaner$CleanerThread" "kafka.log.LogLoader" "kafka.log.LogManager" "kafka.log.UnifiedLog" "kafka.log.UnifiedLog$" "kafka.network.ConnectionQuotas" "kafka.network.SocketServer" "kafka.producer.async.DefaultEventHandler" "kafka.raft.KafkaMetadataLog$" "kafka.raft.KafkaRaftManager$RaftIoThread" "kafka.raft.RaftSendThread" "kafka.raft.TimingWheelExpirationService$ExpiredOperationReaper" "kafka.server.BrokerLifecycleManager" "kafka.server.BrokerToControllerRequestThread" "kafka.server.ClientQuotaManager$ThrottledChannelReaper" "kafka.server.ControllerServer" "kafka.server.DelayedOperationPurgatory$ExpiredOperationReaper" "kafka.server.KafkaConfig" "kafka.server.KafkaRaftServer" "kafka.server.ReplicaAlterLogDirsManager" "kafka.server.ReplicaFetcherManager" "kafka.server.ReplicaManager$LogDirFailureHandler" "kafka.server.SharedServer" "kafka.server.metadata.BrokerMetadataPublisher" "kafka.server.metadata.DynamicConfigPublisher" "kafka.utils.Log4jControllerRegistration$" "org.apache.kafka.controller.QuorumController" "state.change.logger"]] (concat [{:name "CLUSTER_ID", :value "MkU3OEVBNTcwNTJENDM2Qk"} {:name "KAFKA_NODE_ID", :value "1"} {:name "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP", :value "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"} {:name "KAFKA_ADVERTISED_LISTENERS", :value "PLAINTEXT://kafka:29092,PLAINTEXT_HOST://kafka:9092"} {:name "KAFKA_PROCESS_ROLES", :value "broker,controller"} {:name "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", :value "1"} {:name "KAFKA_CONTROLLER_QUORUM_VOTERS", :value "1@kafka:29093"} {:name "KAFKA_LISTENERS", :value "PLAINTEXT://kafka:29092,CONTROLLER://kafka:29093,PLAINTEXT_HOST://0.0.0.0:9092"} {:name "KAFKA_INTER_BROKER_LISTENER_NAME", :value "PLAINTEXT"} {:name "KAFKA_CONTROLLER_LISTENER_NAMES", :value "CONTROLLER"} {:name "KAFKA_LOG4J_ROOT_LOGLEVEL", :value ll} {:name "KAFKA_LOG4J_LOGGER_KAFKA", :value ll} {:name "KAFKA_LOG4J_LOGGERS", :value (clojure.string/join "," (map (fn [l] (str l \= ll)) loggers))} {:name "KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR", :value "1"} {:name "KAFKA_TRANSACTION_STATE_LOG_MIN_ISR", :value "1"} {:name "KAKFA_DEFAULT_REPLICATION_FACTOR", :value "1"}] (:kafka-env params))), :mounts (when-let [v (:data-volume params)] [{:path "/var/lib/kafka/data", :source v}]), :services [{:id :kafka, :ports [{:protocol :tcp, :port 9092}]}]}

## connect
Runs a Kafka Connect container.

### Parameters
- **image** (The image to use.)  
  Name: Image  
  Type: [:default :str "confluentinc/cp-kafka-connect:7.5.1"]
- **container-id** (The ID to give the spawned container.)  
  Name: Container ID  
  Type: [:default :str "kafka-connect-container"]
- **connectors** (The connectors to install, on the form `connector-name:version`. See https://www.confluent.io/hub for available connectors.)  
  Name: Connectors  
  Type: [:str]
- **data-volume** (Volume to use for data.)  
  Name: Data Volume  
  Type: [:maybe :mount-source]
- **bootstrap-servers** (List of host-port pairs to use to connect to the Kafka cluster.)  
  Name: Bootstrap Servers  
  Type: [:default [{:host :str, :port :int}] [{:host "kafka", :port 9092}]]
- **group-id** (ID for the consumer group this Connect instance belongs to.)  
  Name: Consumer Group ID  
  Type: [:default :str "kafka-connect"]
- **config-topic** (Name of the topic used to store Kafka Connect configuration.)  
  Name: Config Storage Topic  
  Type: [:default :str "kafka-connect-config"]
- **config-replication-factor** (The replication factor for the config storage topic.)  
  Name: Config Topic Replication Factor  
  Type: [:default :int 1]
- **offset-topic** (Name of the topic used to store Kafka Connect offsets.)  
  Name: Offset Storage Topic  
  Type: [:default :str "kafka-connect-offset"]
- **offset-replication-factor** (The replication factor for the config storage topic.)  
  Name: Offset Topic Replication Factor  
  Type: [:default :int 1]
- **status-topic** (Name of the topic used to store Kafka Connect status.)  
  Name: Status Storage topic  
  Type: [:default :str "kafka-connect-status"]
- **status-replication-factor** (The replication factor for the config storage topic.)  
  Name: Status Topic Replication Factor  
  Type: [:default :int 1]
- **key-converter** (Name of the converter class used for keys.)  
  Name: Key Converter Class  
  Type: [:default :str "org.apache.kafka.connect.json.JsonConverter"]
- **value-converter** (Name of the converter class used for values.)  
  Name: Value Converter Class  
  Type: [:default :str "org.apache.kafka.connect.json.JsonConverter"]
- **env** (Additional environment variables to pass to Kafka Connect.)  
  Name: Environment Variables  
  Type: [:maybe [:env-var]]
- **root-log-level** (The Log4J root log level.)  
  Name: Root log level  
  Type: [:default [:enum "TRACE" "DEBUG" "INFO" "WARN" "ERROR" "FATAL" "OFF"] "INFO"]
- **port** (The Kafka Connect REST port.)  
  Name: REST Port  
  Type: [:default :int 8083]
- **restart** (Restart policy for the container.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]

Module: polytope/container  
Args: {:image (:image params), :env (concat [{:name "CONNECT_BOOTSTRAP_SERVERS", :value (->> (for [{:keys [host port]} (:bootstrap-servers params)] (str host \: port)) (clojure.string/join ","))} {:name "CONNECT_GROUP_ID", :value (:group-id params)} {:name "CONNECT_CONFIG_STORAGE_TOPIC", :value (:config-topic params)} {:name "CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR", :value (str (:config-replication-factor params))} {:name "CONNECT_OFFSET_STORAGE_TOPIC", :value (:offset-topic params)} {:name "CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR", :value (str (:offset-replication-factor params))} {:name "CONNECT_STATUS_STORAGE_TOPIC", :value (:status-topic params)} {:name "CONNECT_STATUS_STORAGE_REPLICATION_FACTOR", :value (str (:status-replication-factor params))} {:name "CONNECT_KEY_CONVERTER", :value (:key-converter params)} {:name "CONNECT_VALUE_CONVERTER", :value (:value-converter params)} {:name "CONNECT_REST_ADVERTISED_HOST_NAME", :value "kafka-connect"} {:name "CONNECT_REST_PORT", :value (str (:port params))} {:name "CONNECT_LOG4J_ROOT_LOGLEVEL", :value (:root-log-level params)}] (:env params)), :restart (:restart params), :mounts (when-let [v (:data-volume params)] [{:path "/usr/share/confluent-hub-components", :source v}]), :services [{:id :kafka-connect, :ports [{:protocol :http, :port (:port params)}]}], :cmd (when-let [connectors (:connectors params)] (let [cmds (mapv (fn [c] (str "confluent-hub install --no-prompt " c)) connectors)] (->> (conj cmds "/etc/confluent/docker/run") (clojure.string/join " && ") (vector "sh" "-c"))))}

## schema-registry
Runs a Kafka Schema Registry container.

### Parameters
- **image** (The image to use.)  
  Name: Image  
  Type: [:default :str "confluentinc/cp-schema-registry:7.5.1"]
- **container-id** (The ID to give the spawned container.)  
  Name: Container ID  
  Type: [:default :str "schema-registry-container"]
- **bootstrap-servers** (List of host-port pairs to use to connect to the Kafka cluster.)  
  Name: Bootstrap Servers  
  Type: [:default [{:host :str, :port :int}] [{:host "kafka", :port 9092}]]
- **topic** (Name of the topic used to store schemas.)  
  Name: Schema Topic  
  Type: [:default :str "_schemas"]
- **topic-replication-factor** (The replication factor for the schema topic.)  
  Name: Schema Topic Replication Factor  
  Type: [:default :int 1]
- **env** (Additional environment variables.)  
  Name: Environment Variables  
  Type: [:maybe [:env-var]]
- **port** (The HTTP port.)  
  Name: HTTP Port  
  Type: [:default :int 8081]
- **restart** (Restart policy for the container.)  
  Name: Restart policy  
  Type: [:default {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]} {:policy "always", :max-restarts nil}]
- **root-log-level** (The Log4J root log level.)  
  Name: Root log level  
  Type: [:default [:enum "TRACE" "DEBUG" "INFO" "WARN" "ERROR" "FATAL" "OFF"] "INFO"]

Module: polytope/container  
Args: {:image (:image params), :env (concat [{:name "SCHEMA_REGISTRY_HOST_NAME", :value "schema-registry"} {:name "SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS", :value (->> (for [{:keys [host port]} (:bootstrap-servers params)] (str host \: port)) (clojure.string/join ","))} {:name "SCHEMA_REGISTRY_LISTENERS", :value (str "http://0.0.0.0:" (:port params))} {:name "SCHEMA_REGISTRY_LOG4J_ROOT_LOGLEVEL", :value (:root-log-level params)}] (:env params)), :restart (:restart params), :services [{:id :schema-registry, :ports [{:protocol :http, :port (:port params)}]}]}

## control-center
Runs the Confluent Control Center.

### Parameters
- **image** (The image to use.)  
  Name: Image  
  Type: [:default :str "confluentinc/cp-enterprise-control-center:7.5.1"]
- **container-id** (The ID to give the spawned container.)  
  Name: Container ID  
  Type: [:default :str "control-center-container"]
- **bootstrap-servers** (List of host-port pairs to use to connect to the Kafka cluster.)  
  Name: Bootstrap Servers  
  Type: [:default [{:host :str, :port :int}] [{:host "kafka", :port 9092}]]
- **connect-cluster-url** (Kafka Connect cluster to use.)  
  Name: Connect Cluster URL  
  Type: [:maybe :str]
- **schema-registry-url** (Schema Registry to connect to.)  
  Name: Schema Registry URL  
  Type: [:maybe :str]
- **env** (Additional environment variables to pass to Kafka Connect.)  
  Name: Environment Variables  
  Type: [:maybe [:env-var]]
- **replication-factor** (The replication factor for internal topics.)  
  Name: Replication Factor  
  Type: [:default :int 1]
- **root-log-level** (The Log4J root log level.)  
  Name: Root log level  
  Type: [:default [:enum "TRACE" "DEBUG" "INFO" "WARN" "ERROR" "FATAL" "OFF"] "INFO"]
- **port** (The Control Center HTTP port.)  
  Name: HTTP Port  
  Type: [:default :int 9021]
- **restart** (Restart policy for the container.)  
  Name: Restart policy  
  Type: [:default {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]} {:policy "always", :max-restarts nil}]

Module: polytope/container  
Args: {:image (:image params), :id (:container-id params), :env (concat [{:name "CONTROL_CENTER_BOOTSTRAP_SERVERS", :value (->> (for [{:keys [host port]} (:bootstrap-servers params)] (str host \: port)) (clojure.string/join ","))} {:name "CONTROL_CENTER_SCHEMA_REGISTRY_URL", :value (:schema-registry-url params)} {:name "CONTROL_CENTER_CONNECT_CONNECT-DEFAULT_CLUSTER", :value (:connect-cluster-url params)} {:name "CONTROL_CENTER_CONNECT_HEALTHCHECK_ENDPOINT", :value "/connectors"} {:name "CONTROL_CENTER_REPLICATION_FACTOR", :value (str (:replication-factor params))} {:name "CONTROL_CENTER_LOG4J_ROOT_LOGLEVEL", :value (:root-log-level params)}] (:env params)), :restart (:restart params), :services [{:id :control-center, :ports [{:port (:port params), :protocol :http}]}]}

## create-connectors
Creates Kafka Connect connectors.

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "curlimages/curl"]
- **host** (The hostname via which to access Kafka Connect.)  
  Name: Hostname  
  Type: :str
- **port** (The port at which to access the Kafka Connect REST API.)  
  Name: Port  
  Type: [:default :int 8083]
- **connectors** (Connector specifications to submit to Kafka Connect.)  
  Name: Connectors  
  Type: [{:name :str, :config [:map :str :str]}]

Module: polytope/container  
Args: {:image (:image params), :id "create-connectors", :cmd (let [url (str "http://" (:host params) \: (:port params) "/connectors")] ["sh" "-c" (str "i=0\n" "trap 'echo \"SIGTERM received, exiting...\"; exit 1' TERM\n" "url=" url "\n" "while ! curl -o /dev/null -s --head --fail $url; do\n" "  i=$((i + 1))\n" "  [ $((i % 10)) -eq 1 ] && echo \"Can't connect to $url – retrying...\"\n" "  sleep 1\n" "done\n" "post() {\n" "  f=$(mktemp)\n" "  s=$(curl -X PUT $url/$1/config -i -H \"Content-Type: application/json\" -o $f -s -w \"%{http_code}\\n\" -d @-)\n" "  if [ $s -lt 200 -o $s -ge 300 ]; then\n" "    echo \"Failed to submit connector $1 (got HTTP $s):$()\"\n" "    cat $f\n" "    exit 1\n" "  fi\n" "}\n" (->> (map (fn [x] (str "post " (:name x) " << 'EOF'\n " (pt/write-json (:config x)) "\nEOF\n" "echo \"Submitted connector " (:name x) "\"")) (:connectors params)) (clojure.string/join "\n")))])}

## kcat
Runs the kcat utility.

### Parameters

Module: polytope/container  
Args: {:image "confluentinc/cp-kcat:7.5.1", :entrypoint "/bin/bash"}

# polytope/python
Module for running Python.

## python (default)
Runs a Python container.

### Parameters
- **image** (The container image to use.)  
  Name: Version  
  Type: [:default :str "public.ecr.aws/docker/library/python:3.12.2-slim-bookworm"]
- **code** (Optional source code directory to mount into the container.)  
  Name: Code  
  Type: [:maybe :mount-source]
- **cmd** (The command to run. Runs a Python shell if left blank.)  
  Name: Command  
  Type: [:maybe [:either :str [:str]]]
- **env** (Environment variables for the container.)  
  Name: Environment variables  
  Type: [:maybe [{:name :str, :value [:either :str :bool :int]}]]
- **requirements** (Optional requirements.txt file to install before running the command.)  
  Name: Requirements file  
  Type: [:maybe :mount-source]
- **services** (Ports in the container to expose as services.)  
  Name: Services  
  Type: [:maybe [:service-spec]]
- **id** (The container's ID/name.)  
  Name: ID  
  Type: [:maybe :id]
- **mounts** (Additional files or directories to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [[:maybe {:source :mount-source, :path :absolute-path}]]]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]

Module: polytope/container  
Args: {:cmd (if (:requirements params) (if (or (nil? (:cmd params)) (string? (:cmd params))) (str "sh -c 'pip install -r /requirements.txt; " (or (:cmd params) "python") "'") (str "sh -c 'pip install -r /requirements.txt; " (str/join " " (:cmd params)) "'")) (:cmd params)), :env (:env params), :services (:services params), :id (:id params), :image (:image params), :mounts (vec (concat (when-let [code (:code params)] [{:source code, :path "/app"}]) (when-let [reqs (:requirements params)] [{:source reqs, :path "/requirements.txt"}]) (:mounts params))), :restart (:restart params), :workdir "/app"}

## simple
Runs a Python container with minimal configuration.

### Parameters
- **code** (Optional source code directory to mount into the container.)  
  Name: Code  
  Type: [:maybe :mount-source]
- **cmd** (The command to run. Runs a Python shell if left blank.)  
  Name: Command  
  Type: [:maybe :str]
- **env** (Environment variables for the container.)  
  Name: Environment variables  
  Type: [:maybe [:env-var]]
- **services** (Ports in the container to expose as services.)  
  Name: Services  
  Type: [:maybe [{:id :str, :port :int}]]

Module: polytope/container  
Args: {:cmd (:cmd params), :env (:env params), :services (map (fn [{:keys [id port]}] {:id id, :ports [{:port port, :protocol :http}]}) (:services params)), :image "python:3.11", :update-image false, :mounts (vec (concat (when-let [code (:code params)] [{:source code, :path "/app"}]) (when-let [reqs (:requirements params)] [{:source reqs, :path "/requirements"}]))), :workdir "/app"}

# polytope/curity
Module for running Curity.

## idsvr (default)
Runs a Curity ID server container.

### Parameters
- **image** (The container image to run.)  
  Name: Image  
  Type: [:default :str "curity.azurecr.io/curity/idsvr:9.0.1-slim"]
- **id** (The ID to use for the container.)  
  Name: ID  
  Type: [:default :str "curity-idsvr"]
- **cmd** (The command to run in the container. If unspecified, runs the ID server.)  
  Name: Command  
  Type: [:maybe [:either :str [[:maybe :str]]]]
- **password** (The admin password to use.)  
  Name: Password  
  Type: :str
- **env** (Environment variables to pass to the server.)  
  Name: Environment variables  
  Type: [:maybe [:env-var]]
- **config-file** (The XML config file to use.)  
  Name: Config file  
  Type: [:maybe :mount-source]
- **license-file** (The license file to use.)  
  Name: License file  
  Type: [:maybe :mount-source]
- **mounts** (Code or files to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [{:source :mount-source, :path :absolute-path}]]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]
- **log-level** (The log level for the ID server.)  
  Name: Log level  
  Type: [:default :str "INFO"]

Module: polytope/container  
Args: {:image (:image params), :id (:id params), :env (concat [{:name "PASSWORD", :value (:password params)} (when (:log-level params) {:name "LOGGING_LEVEL", :value (:log-level params)})] (:env params)), :mounts (->> [(when-let [f (:config-file params)] {:source f, :path "/opt/idsvr/etc/init/config.xml"}) (when-let [f (:license-file params)] {:source f, :path "/opt/idsvr/etc/init/license/license.json"})] (concat (:mounts params)) (remove nil?)), :services [{:id :curity, :ports [{:port 6749, :protocol :https, :label :admin} {:port 8443, :protocol :https, :label :api}]}], :restart (:restart params), :cmd (:cmd params)}

# polytope/kong
Modules for running Kong.

Contains a `simple` version to run with minimal configuration. When plugins are specified, runs as the `root` user to install the plugins, then runs kong itself as the `kong` user. For production use-cases, it's recommended to instead build a custom container image containing the plugins

## kong (default)
Runs a Kong Gateway container.

### Parameters
- **image** (The container image to run.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/docker/library/kong:3.6.1"]
- **id** (The ID to use for the container.)  
  Name: ID  
  Type: [:default :str "kong"]
- **cmd** (The command to run in the container. If unspecified, runs the Kong Gateway.)  
  Name: Command  
  Type: [:maybe [:either :str [[:maybe :str]]]]
- **port** (The port Kong is served in on.)  
  Name: Port  
  Type: [:default :int 3000]
- **env** (Environment variables to pass to Kong.)  
  Name: Environment variables  
  Type: [:maybe [:env-var]]
- **mounts** (Code or files to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [{:source :mount-source, :path :absolute-path}]]
- **user** (The user to run commands in the container as.)  
  Name: User  
  Type: [:maybe [:either :int :str]]
- **services** (The services to expose.)  
  Name: Services  
  Type: [:maybe [:service-spec]]

Module: polytope/container  
Args: {:image (:image params), :id (:id params), :cmd (:cmd params), :env (:env params), :mounts (:mounts params), :services (:services params), :user (:user params)}

## simple
Runs a Kong Gateway container with pre-specified plugins and config file.

### Parameters
- **port** (The port to serve Kong on.)  
  Name: Port  
  Type: [:default :int 3000]
- **plugins** (List of Kong plugins to install.)  
  Name: Plugins  
  Type: [:maybe [{:name :str, :version :str, :package :str}]]
- **config-file** (The declarative YAML config file to use.)  
  Name: Config file  
  Type: :mount-source
- **autoreload** (If true, watches for changes to the config file and reloads Kong when it changes.)  
  Name: Autoreload  
  Type: [:default :bool false]
- **log-level** (Kong's log level.)  
  Name: Log level  
  Type: [:default :str "info"]
- **env** (Environment variables to pass to Kong.)  
  Name: Environment variables  
  Type: [:maybe [:env-var]]
- **services** (The services to expose.)  
  Name: Services  
  Type: [:default [:service-spec] [{:id :kong, :ports [{:port 3000, :protocol :http}]}]]

Module: kong  
Args: {:cmd (let [c1 (when-let [p (not-empty (:plugins params))] (str "git config --global advice.detachedHead false" (clojure.string/join (map (fn [{n :name, v :version, p :package}] (str " && luarocks install " p " " v)) p)) " && chmod a+w /dev/stdout /dev/stderr\n")) c2 (when (:autoreload params) (->> ["check() { stat -c %Y /usr/local/kong/declarative/kong.yml; }" "run() { /docker-entrypoint.sh kong docker-start & p=$!; }" "trap 'kill -TERM $p; wait $p; exit $?' TERM" "trap 'kill -INT $p; wait $p; exit $?' INT" "trap 'kill -QUIT $p; wait $p; exit $?' QUIT" "o=$(check)" "run" "while sleep 1; do" "  if ! kill -0 $p 2>/dev/null; then" "    wait $p && exit $?" "  fi" "  n=$(check)" "  if [ $n != $o ]; then" "    echo 'Config changed; restarting...'" "    kill -TERM $p" "    wait $p" "    o=$n" "    run" "  fi" "done"] (clojure.string/join "\n")))] (when (or c1 c2) ["sh" "-c" (clojure.string/join "\n" (remove nil? [c1 c2]))])), :env (concat [{:name "KONG_DATABASE", :value "off"} {:name "KONG_DECLARATIVE_CONFIG", :value "/usr/local/kong/declarative/kong.yml"} {:name "KONG_LOG_LEVEL", :value (:log-level params)} {:name "KONG_PLUGINS", :value (clojure.string/join \, (into ["bundled"] (map :name (:plugins params))))} {:name "KONG_PROXY_LISTEN", :value (str "0.0.0.0:" (:port params))}] (:env params)), :mounts [{:source (:config-file params), :path "/usr/local/kong/declarative/kong.yml"}], :port (:port params), :services (:services params), :user (when (not-empty (:plugins params)) 0)}

# polytope/hello-world
Module for printing a "Hello world!" message.

## hello-world
Prints a message to the logs.

### Parameters
- **message** (The message to be printed.)  
  Name: Message  
  Type: [:default :str "Hello world!"]

Code: (println (:message params))

# polytope/node
Module for running Node.

## node
Runs a Node.js container.

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :str "public.ecr.aws/docker/library/node:21.7.0-slim"]
- **code** (Optional source code directory to mount into the container.)  
  Name: Code  
  Type: [:maybe :mount-source]
- **cmd** (The command to run. Runs a Node shell if left blank.)  
  Name: Command  
  Type: [:maybe [:either :str [:str]]]
- **env** (Environment variables for the container.)  
  Name: Environment variables  
  Type: [:maybe [{:name :str, :value [:either :str :int :bool]}]]
- **id** (The container's ID/name.)  
  Name: ID  
  Type: [:maybe :id]
- **mounts** (Additional files or directories to mount into the container.)  
  Name: Mounts
  Type: [:maybe [[:maybe {:source :mount-source, :path :absolute-path}]]]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:enum "always" "on-failure"], :max-restarts [:maybe :int]}]
- **services** (Ports in the container to expose as services.)  
  Name: Services  
  Type: [:maybe [:service-spec]]

Module: polytope/container  
Args: {:cmd (if (:package params) (if (or (nil? (:cmd params)) (string? (:cmd params))) (str "sh -c 'npm install /package.json; " (or (:cmd params) "node") "'") (str "sh -c 'npm install /package.json; " (str/join " " (:cmd params)) "'")) (:cmd params)), :env (:env params), :services (:services params), :image (:image params), :id (:id params), :mounts (vec (concat (when-let [code (:code params)] [{:source code, :path "/app"}]) (when-let [reqs (:package params)] [{:source reqs, :path "/package.json"}]) (:mounts params))), :restart (:restart params), :workdir "/app"}

### Example module spec for polytope.yml
modules:
  - id: frontend
    module: polytope/node
    args:
      id: frontend
      image: node:22-bullseye-slim
      code: { type: host, path: ./frontend }
      cmd: ./bin/run
      env:
        - { name: PORT, value: 3000 }
      restart:
        policy: always
      services:
        - id: frontend
          ports: [{protocol: http, port: 3000, expose-as: 3000}]
      mounts:
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache }}
        - { path: /root/.npm/, source: { type: volume, scope: project, id: npm-cache }}
        - { path: /app/node_modules/, source: { type: volume, scope: project, id: npm-modules }}
### Best practices

#### Include the following mounts for caching of none modules
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache }}
        - { path: /root/.npm/, source: { type: volume, scope: project, id: npm-cache }}
        - { path: /app/node_modules/, source: { type: volume, scope: project, id: npm-modules }}

#### Place all code that should run in the node container in a separate directory under a directory called ./src/<name of app>, e.g. "./src/frontend"
      code: { type: host, path: ./src/frontend }

# polytope/container
Module for running Docker containers.

## container
Runs a Docker container.

### Parameters
- **image** (The Docker image to run.)  
  Name: Image  
  Type: :docker-image
- **id** (The container's ID/name.)  
  Name: ID  
  Type: [:maybe :id]
- **cmd** (The command to run in the container.)  
  Name: Command  
  Type: [:maybe [:either :str [[:maybe :str]]]]
- **mounts** (Code or files to mount into the container.)  
  Name: Mounts  
  Type: [:maybe [[:maybe {:source :mount-source, :path :absolute-path}]]]
- **env** (Environment variables for the container.)  
  Name: Environment variables  
  Type: [:maybe [[:maybe :env-var]]]
- **workdir** (The container's working directory.)  
  Name: Working directory  
  Type: [:maybe :absolute-path]
- **entrypoint** (The container's entrypoint.)  
  Name: Entrypoint  
  Type: [:maybe [:either :str [[:maybe :str]]]]
- **no-stdin** (Whether to keep the container's stdin closed.)  
  Name: Non-interactive  
  Type: [:default :bool false]
- **tty** (Whether to allocate a pseudo-TTY for the container.)  
  Name: TTY  
  Type: [:default :bool true]
- **services** (Ports in the container to expose as services.)  
  Name: Services  
  Type: [:maybe [:service-spec]]
- **datasets** (Paths in the container to store as datasets upon termination.)  
  Name: Datasets  
  Type: [:maybe [{:path :absolute-path, :sink :dataset-sink}]]
- **user** (The user (name or UID) to run commands in the container as.)  
  Name: User  
  Type: [:maybe [:either :int :str]]
- **restart** (What policy to apply on restarting containers that fail.)  
  Name: Restart policy  
  Type: [:maybe {:policy [:maybe [:enum "never" "always" "on-failure"]], :max-restarts [:maybe :int]}]
- **update-image** (Restart policy for the container.)  
  Name: Update image  
  Type: [:default :bool false]
- **instance-type** (The instance type to run the container on.)  
  Name: Instance type  
  Type: [:maybe :instance-type]
- **resources** (The resources to allocate for the container.)  
  Name: Resources  
  Type: [:maybe {:cpu {:request [:maybe :num], :limit [:maybe :num]}, :memory {:request [:maybe :data-size], :limit [:maybe :data-size]}, :gpu :bool}]

Code: (let [id (pt/spawn-container (dissoc params :services :datasets))] (pt/await-container-started id) (doseq [service (:services params)] (pt/open-service service)) (let [exit-code (pt/await-container-exited id)] (when (not= 0 exit-code) (pt/fail "The container exited with a nonzero exit code." {:exit-code exit-code}))) (doseq [{:keys [path sink]} (:datasets params)] (pt/store-dataset {:type "container-path", :container-id id, :path path} sink)))

# polytope/jupyter
Module for running Jupyter notebooks.

## jupyter
Runs a Jupyter notebook.

### Parameters
- **image** (The container image to use.)  
  Name: Image  
  Type: [:default :docker-image "jupyter/base-notebook"]
- **code** (Code to use from the notebook.)  
  Name: Code  
  Type: [:maybe :mount-source]
- **mounts** (Other code or files to mount into the Jupyter container.)  
  Name: Mounts  
  Type: [:maybe [[:maybe {:source :mount-source, :path :absolute-path}]]]
- **env** (Environment variables for the Jupyter container.)  
  Name: Environment variables  
  Type: [:maybe [[:maybe :env-var]]]
- **requirements** (Optional requirements.txt file to install before running the notebook.)  
  Name: Requirements file  
  Type: [:maybe :mount-source]
- **datasets** (Paths in the Jupyter container to store as datasets.)  
  Name: Datasets  
  Type: [:maybe [{:path :absolute-path, :sink :dataset-sink}]]

Module: polytope/container  
Args: {:image (:image params), :mounts (concat (when-let [code (:code params)] [{:source code, :path "/home/jovyan/code"}]) (:mounts params) (when-let [reqs (:requirements params)] [{:source reqs, :path "/requirements"}]) [{:source {:type "repo", :repo pt/module-project-ref, :path "/custom.js"}, :path "/home/jovyan/.jupyter/custom/custom.js"} {:source {:type "repo", :repo pt/module-project-ref, :path "/config.py"}, :path "/home/jovyan/.jupyter/jupyter_notebook_config.py"}]), :datasets (:datasets params), :env (concat [{:name "DOCKER_STACKS_JUPYTER_CMD", :value "notebook"}] (:env params)), :services [{:id :jupyter, :ports [{:port 8888, :protocol :http}]}], :cmd (if (:requirements params) ["bash" "-c" "pip install -r /requirements && start-notebook.sh"] "start-notebook.sh"), :user 0}
