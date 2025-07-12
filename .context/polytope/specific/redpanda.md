# Documentation on how to use Redpanda in Polytope

## Latest docker images
Redpanda server image: "redpandadata/redpanda"
Redpanda console image: "redpandadata/console:v2.8.7"
Redpanda connect image: "redpandadata/connect"

## Needs to be initialized before use
Redpanda server needs to be initialized. This can be done by running the Redpanda init app. Include the Redpanda init app in the template that runs the Redpanda module.

It can take up to 10 minutes for Redpanda server to be initialized on the first run depending on the machine it is running on. Code that depends on Redpanda being up and running therefore needs to have long connection retry periods.

## Instructions for setting up the Redpanda init app
When running a redpanda module you also need to run this redpanda-init module. 

### Add the following code to the polytope.yml file
<code type="yaml">
modules:
  ...
  
  - id: redpanda-init
    module: polytope/python
    args:
      image: gcr.io/arched-inkwell-420116/python:3.11.8-slim-bookworm
      code: { type: host, path: ./src/redpanda-init }
      cmd: ./bin/run
      restart: { policy: on-failure }
      env:
        - { name: REDPANDA_BOOTSTRAP_SERVERS, value: "redpanda:9092" }
      mounts:
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache }}
        - { path: /root/conf/, source: { type: host, path: ./conf/redpanda }}

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

<file path="./src/couchbase-init/requirements.txt">
couchbase==4.3.2
</file>

### Create the following file

<file path="./src/couchbase-init/src/main.py">
import os
import sys
import yaml
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError

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
        raise FileNotFoundError(f"Data structure configuration file not found at {config_path}")
    except yaml.YAMLError as e:
        raise ValueError(f"Error parsing YAML configuration: {e}")

def create_topics(admin_client, topics):
    new_topics = [NewTopic(name=topic, num_partitions=1, replication_factor=1) for topic in topics]
    try:
        admin_client.create_topics(new_topics)
        print(f"Successfully created topics: {topics}")
    except TopicAlreadyExistsError:
        print(f"Topics already exist: {topics}")
    except Exception as e:
        print(f"Failed to create topics: {e}")
        return False
    return True

def app():
    admin_client = KafkaAdminClient(bootstrap_servers=REDPANDA_BOOTSTRAP_SERVERS.split(','))
    data_structure_spec = load_data_structure_spec()
    if not create_topics(admin_client, data_structure_spec["topics"]):
        return False
    return True

def main():
    if not app():
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()

</file>

### Create the following config file

<file path="./conf/redpanad/data_structures.yml" />

This file should specify the topics that should be exist in the Couchbase server. 

