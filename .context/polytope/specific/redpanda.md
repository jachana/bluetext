# Documentation on how to use Redpanda in Polytope

## Latest docker images
Redpanda server image: "redpandadata/redpanda"
Redpanda console image: "redpandadata/console:v2.8.7"
Redpanda connect image: "redpandadata/connect"

## Needs to be initialized before use
Redpanda server needs to be initialized. This can be done by running the Redpanda init app. Include the Redpanda init app in the template that runs the Redpanda module.

It can take up to 10 minutes for Redpanda server to be initialized on the first run depending on the machine it is running on. Code that depends on Redpanda being up and running therefore needs to have long connection retry periods.

## Instructions for setting up the Redpanda server

### Add the following code to the polytope.yml file
<code type="yaml">
  - id: redpanda
    info: Runs the Redpanda server in dev mode
    module: polytope/redpanda
    args:
      image: docker.redpanda.com/redpandadata/redpanda:v23.3.11
      root-log-level: warn 
      data-volume: { id: redpanda-data, type: volume, scope: project }
</code>

## Instructions for setting up the Redpanda init app
When running a redpanda module you also need to run this redpanda-init module. 

### Add the following code to the polytope.yml file
<code type="yaml">
modules:
  ...
  
  - id: redpanda-init
    module: polytope/python
    args:
      image: python:3.12-slim
      code: { type: host, path: ./src/redpanda-init }
      cmd: ./bin/run
      restart: { policy: on-failure }
      env:
        - { name: REDPANDA_BOOTSTRAP_SERVERS, value: "#pt-value redpanda_bootstrap_servers" }
      mounts:
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache }}
        - { path: /app/conf/, source: { type: host, path: ./conf/redpanda }}

</code>

### Create the following executable file

<file path="./src/redpanda-init/bin/run" mod="x">
#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
[[ "${TRACE:-}" == "true" ]] && set -o xtrace

trap 'jobs -p | xargs -r kill' EXIT

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
readonly CACHE="${HOME}/.cache"

. "$(dirname "$0")/lib/pip_install"

cd "$ROOT"
exec python src/main.py "$@"
</file>

### Create the following executable file

<file path="./src/redpanda-init/bin/lib/pip_install" mod="x">
#!/usr/bin/env bash

(
  cd "$ROOT" && \
  pip install -q --cache-dir "$CACHE" --disable-pip-version-check --root-user-action=ignore -r requirements.txt && \
  if [ -f requirements-dev.txt ]; then
    pip install -q --cache-dir "$CACHE" --disable-pip-version-check --root-user-action=ignore -r requirements-dev.txt
  fi
)
</file>

### Create the following file

<file path="./src/redpanda-init/requirements.txt">
kafka-python
PyYAML==6.0.1
</file>

### Create the following file

<file path="./src/couchbase-init/src/main.py">
import os
import sys
import yaml
import time
import logging
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError, KafkaError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_env_var(name):
    try:
        return os.environ[name]
    except KeyError:
        raise KeyError(f"Environment variable '{name}' is not set")

REDPANDA_BOOTSTRAP_SERVERS = get_env_var('REDPANDA_BOOTSTRAP_SERVERS')

def load_data_structure_spec():
    """Load data structure specification from YAML file"""
    config_path = "/app/conf/data_structure.yml"
    try:
        with open(config_path, 'r') as file:
            return yaml.safe_load(file)
    except FileNotFoundError:
        logger.warning(f"Data structure configuration file not found at {config_path}")
        # Return default configuration with 'users' topic
        return {"topics": ["users"]}
    except yaml.YAMLError as e:
        raise ValueError(f"Error parsing YAML configuration: {e}")

def create_topics(admin_client, topics):
    """Create Kafka topics with retry logic"""
    if not topics:
        logger.info("No topics to create")
        return True
        
    new_topics = [NewTopic(name=topic, num_partitions=1, replication_factor=1) for topic in topics]
    try:
        admin_client.create_topics(new_topics)
        logger.info(f"Successfully created topics: {topics}")
    except TopicAlreadyExistsError:
        logger.info(f"Topics already exist: {topics}")
    except Exception as e:
        logger.error(f"Failed to create topics: {e}")
        return False
    return True

def connect_to_kafka_with_retry(max_retries=30, retry_interval=2):
    """Connect to Kafka with retry logic"""
    for attempt in range(max_retries):
        try:
            admin_client = KafkaAdminClient(
                bootstrap_servers=REDPANDA_BOOTSTRAP_SERVERS.split(','),
                request_timeout_ms=30000,
                api_version=(0, 10, 1)
            )
            # Test the connection by listing topics
            admin_client.list_topics()
            logger.info(f"Connected to Redpanda at {REDPANDA_BOOTSTRAP_SERVERS}")
            return admin_client
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed to connect to Redpanda after {max_retries} attempts: {e}")
                raise
            logger.warning(f"Attempt {attempt + 1}/{max_retries}: Failed to connect to Redpanda: {e}")
            time.sleep(retry_interval)

def app():
    """Main application logic"""
    try:
        admin_client = connect_to_kafka_with_retry()
        data_structure_spec = load_data_structure_spec()
        
        if not create_topics(admin_client, data_structure_spec.get("topics", [])):
            return False
            
        logger.info("Redpanda initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Application error: {e}")
        return False

def main():
    logger.info("Starting Redpanda initialization...")
    logger.info(f"Bootstrap servers: {REDPANDA_BOOTSTRAP_SERVERS}")
    
    if not app():
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()

</file>

### Create the following config files

This following config file should specify the topics that should be exist in the Redpanda server. 
<file path="./conf/redpanda/data_structures.yml" />

<file path="./conf/redpanda/console.yml">
kafka:
  brokers: ["redpanda:9092"]
server:
  listenPort: 8079
logger:
  level: info
connect:
  enabled: false

</file>


## Instructions for how to set up Redpanda console
### Add the following code to the polytope.yml file
<code type="yaml">
modules:
  ...

  - id: redpanda-console
    info: Runs the Redpanda Console service
    module: redpanda-console-base
    args: 
      image: docker.redpanda.com/redpandadata/console:v2.4.5
      container-id: redpanda-console
      brokers: [{host: redpanda, port: 9092}]
      log-level: info
      port: 8079
      restart: { policy: always }

  - id: redpanda-console-base
    info: Runs the Redpanda console.
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
      image: '#pt-clj (:image params)'
      id: '#pt-clj (:container-id params)'
      env:
      - {name: CONFIG_FILEPATH, value: /etc/redpanda-console-config.yaml}
      mounts:
      - path: /etc/redpanda-console-config.yaml
        source:
          type: host
          path: ./conf/redpanda/console.yaml 
      restart: '#pt-clj (:restart params)'
      services:
      - id: redpanda-console
        ports:
        - {port: '#pt-clj (:port params)', protocol: http}
        
</code>