# Documentation on how to create a Couchbase init app

## Add the following code to the polytope.yml file

<code type="yaml">
modules:
  ...
  
  - id: couchbase-init
    params:
    module: polytope/python
    args:
      image: gcr.io/arched-inkwell-420116/python:3.11.8-slim-bookworm
      id: init-couchbase
      code: { type: host, path: ./util/couchbase-init }
      cmd: ./bin/run
      restart: { policy: on-failure }
      env:
        - { name: COUCHBASE_HOST, value: couchbase }
        - { name: COUCHBASE_USERNAME, value: admin }
        - { name: COUCHBASE_PASSWORD, value: password }
        - { name: COUCHBASE_MAIN_BUCKET_NAME, value: main }
      mounts:
        - { path: /root/.cache/, source: { type: volume, scope: project, id: dependency-cache }}

</code>

## Create the following executable file

<file path="./util/couchbase-init/bin/run" mod="x">
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

## Create the following executable file

<file path="./util/couchbase-init/bin/lib/pip_install" mod="x">
#!/usr/bin/env bash

(
  cd "$ROOT" && \
  pip install -q --cache-dir "$CACHE" --disable-pip-version-check --root-user-action=ignore -r requirements.txt && \
  if [ -f requirements-dev.txt ]; then
    pip install -q --cache-dir "$CACHE" --disable-pip-version-check --root-user-action=ignore -r requirements-dev.txt
  fi
)
</file>

## Create the following file

<file path="./util/couchbase-init/requirements.txt">
couchbase==4.3.2
</file>

## Create the following file

<file path="./util/couchbase-init/src/main.py">
import os
import sys
from controllers.controller_cluster import ControllerCluster
from controllers.controller_bucket import ControllerBucket
from controllers.controller_data_structure import ControllerDataStructure

def get_env_var(name, default=None):
    try:
        if default:
            return os.environ.get(name, default)
        else:
            return os.environ[name]
    except KeyError:
        raise KeyError(f"Environment variable '{name}' is not set")

COUCHBASE_USERNAME = get_env_var('COUCHBASE_USERNAME')
COUCHBASE_PASSWORD = get_env_var('COUCHBASE_PASSWORD')
COUCHBASE_HOST = get_env_var('COUCHBASE_HOST')
COUCHBASE_TLS = get_env_var('COUCHBASE_TLS', 'false').lower() == 'true'
COUCHBASE_MAIN_BUCKET_NAME = get_env_var('COUCHBASE_MAIN_BUCKET_NAME')
COUCHBASE_TYPE = get_env_var('COUCHBASE_TYPE', 'server')

data_structure_spec = {"_default": ["chats", "chat_messages"]}

def main():
    controller_cluster = ControllerCluster(COUCHBASE_HOST, COUCHBASE_USERNAME, COUCHBASE_PASSWORD, COUCHBASE_TLS, COUCHBASE_TYPE)
    if COUCHBASE_TYPE == 'server':
        controller_cluster.ensure_initialized()
    cluster = controller_cluster.connect_with_retry()
    try:
        controller_bucket = ControllerBucket(controller_cluster, cluster)
        bucket = controller_bucket.ensure_created(COUCHBASE_MAIN_BUCKET_NAME)

        controller_data_structure = ControllerDataStructure(bucket)
        controller_data_structure.create(data_structure_spec)
    finally:
        cluster.close()
    sys.exit(0)

if __name__ == "__main__":
    main()

</file>

## Create the following file

<file path="./util/couchbase-init/src/controllers/controller_bucket.py">
import time
from couchbase.management.buckets import CreateBucketSettings, BucketType
from couchbase.exceptions import BucketDoesNotExistException

class ControllerBucket:
    def __init__(self, controller_cluster, cluster):
        self.controller_cluster = controller_cluster
        self.cluster = cluster

    def ensure_created(self, bucket_name, ram_quota_mb=100):
        bucket_manager = self.cluster.buckets()

        try:
            bucket_manager.get_bucket(bucket_name)
            print(f"Bucket '{bucket_name}' already exists.")
        except BucketDoesNotExistException:
            if self.controller_cluster.type == "capella":
                raise Exception(f"No bucket '{bucket_name}' exists in Capella cluster. When using  bucket must be created manually using the Capella UI.")
            try:
                bucket_manager.create_bucket(
                    CreateBucketSettings(
                        name=bucket_name,
                        bucket_type=BucketType.COUCHBASE,
                        ram_quota_mb=ram_quota_mb
                    )
                )
                print(f"Bucket '{bucket_name}' created successfully.")
            except Exception as e:
                raise Exception(f"Failed to create bucket '{bucket_name}': {e}")
        return self.wait_for_bucket_ready(bucket_name)

    def wait_for_bucket_ready(self, bucket_name, max_retries=30, retry_interval=1):
        for attempt in range(max_retries):
            try:
                bucket = self.cluster.bucket(bucket_name)
                bucket.ping()
                print(f"Bucket '{bucket_name}' is ready.")
                return bucket
            except Exception as e:
                if attempt == max_retries - 1:
                    print("Timeout: waiting until bucket ready.")
                    raise e
                print(f"Waiting until bucket '{bucket_name}' is ready")
                time.sleep(retry_interval)
</file>

## Create the following file

<file path="./util/couchbase-init/src/controllers/controller_cluster.py">
import time
import urllib.request
import urllib.error
import urllib.parse
from datetime import timedelta
from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, WaitUntilReadyOptions
from couchbase.exceptions import RequestCanceledException, AuthenticationException
from couchbase.diagnostics import ServiceType

class ControllerCluster:
    def __init__(self, host, username, password, tls, type):
        self.host = host
        self.username = username
        self.password = password
        self.tls = tls
        self.type = type

    def get_connection_string(self):
        protocol = "couchbases" if self.tls else "couchbase"
        return f"{protocol}://{self.host}"

    def params_cluster_init(self):
        protocol = "https" if self.tls else "http"
        port = "18091" if self.tls else "8091"
        return {
            'url': f"{protocol}://{self.host}:{port}/clusterInit",
            'data': {
                'username': self.username,
                'password': self.password,
                'services': 'kv,n1ql,index,fts,eventing',
                'hostname': '127.0.0.1',
                'memoryQuota': '256',
                'sendStats': 'false',
                'clusterName': 'cillers',
                'setDefaultMemQuotas': 'true',
                'indexerStorageMode': 'plasma',
                'port': 'SAME'
            }
        }

    def ensure_initialized(self):
        encoded_data = urllib.parse.urlencode(self.params_cluster_init()['data']).encode()
        request = urllib.request.Request(
            self.params_cluster_init()['url'],
            data=encoded_data,
            method='POST')
        max_retries = 100
        for attempt in range(max_retries):
            try:
                with urllib.request.urlopen(request, timeout=10*60) as response:
                    response.read().decode()
                    print("Cluster initialization successful.")
                return
            except Exception as e:
                if attempt == max_retries - 1:
                    print('Timeout: Waiting until cluster is started')
                    raise e
                error_message = str(e)
                if 'already initialized' in error_message or 'Unauthorized' in error_message:
                    print("Cluster already initialized.")
                    return
                print("Waiting until cluster is started ... ")
                time.sleep(1)
        assert False

    def connect(self):
        auth = PasswordAuthenticator(self.username, self.password)
        cluster_options = ClusterOptions(auth)
        if self.tls:
            cluster_options.verify_credentials = True
        cluster = Cluster(self.get_connection_string(), cluster_options)
        wait_options = WaitUntilReadyOptions(
                service_types=[ServiceType.KeyValue,
                               ServiceType.Query,
                               ServiceType.Management])
        cluster.wait_until_ready(timedelta(seconds=300), wait_options)
        return cluster

    def connect_with_retry(self, max_retries=30, retry_interval=1):
        for attempt in range(max_retries):
            try:
                return self.connect()
            except (RequestCanceledException, AuthenticationException) as e:
                if attempt == max_retries - 1:
                    if isinstance(e, RequestCanceledException):
                        print('Timeout: Connecting to cluster.')
                    elif isinstance(e, AuthenticationException):
                        print('Authentication failed: Cluster might not be fully initialized.')
                    raise e

                if isinstance(e, RequestCanceledException):
                    print("Waiting for connection to cluster ...")
                elif isinstance(e, AuthenticationException):
                    print("Waiting for cluster to initialize ...")

                time.sleep(retry_interval)</file>

## Create the following file

<file path="./util/couchbase-init/src/controllers/controller_data_structure.py">
from couchbase.management.collections import CreateCollectionSettings
from couchbase.exceptions import ScopeAlreadyExistsException, CollectionAlreadyExistsException

class ControllerDataStructure:
    def __init__(self, bucket):
        self.bucket = bucket

    def create_scope(self, collection_manager, scope_name):
        try:
            collection_manager.create_scope(scope_name)
            print(f"Scope '{scope_name}' created successfully.")
        except ScopeAlreadyExistsException:
            print(f"Scope '{scope_name}' already exists.")

    def create_collections(self, collection_manager, scope_name, collection_names):
        for collection_name in collection_names:
            try:
                collection_manager.create_collection(
                    scope_name,
                    collection_name,
                    CreateCollectionSettings()
                )
                print(f"Collection '{collection_name}' created successfully in scope '{scope_name}'.")
            except CollectionAlreadyExistsException:
                print(f"Collection '{collection_name}' already exists in scope '{scope_name}'.")

    def create(self, spec):
        collection_manager = self.bucket.collections()
        for scope_name, collection_names in spec.items():
            if scope_name != '_default':
                self.create_scope(collection_manager, scope_name)
            self.create_collections(collection_manager, scope_name, collection_names)

</file>