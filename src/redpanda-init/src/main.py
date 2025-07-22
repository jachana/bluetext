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
