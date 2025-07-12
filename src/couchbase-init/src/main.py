import os
import sys
import yaml
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

def main():
    controller_cluster = ControllerCluster(COUCHBASE_HOST, COUCHBASE_USERNAME, COUCHBASE_PASSWORD, COUCHBASE_TLS, COUCHBASE_TYPE)
    if COUCHBASE_TYPE == 'server':
        controller_cluster.ensure_initialized()
    cluster = controller_cluster.connect_with_retry()
    try:
        controller_bucket = ControllerBucket(controller_cluster, cluster)
        bucket = controller_bucket.ensure_created(COUCHBASE_MAIN_BUCKET_NAME)

        controller_data_structure = ControllerDataStructure(bucket)
        data_structure_spec = load_data_structure_spec()
        controller_data_structure.create(data_structure_spec)
    finally:
        cluster.close()
    sys.exit(0)

if __name__ == "__main__":
    main()
