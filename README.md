# Polytope Redpanda Stack

This project provides a complete Redpanda message broker setup with Polytope, including:

- **Redpanda**: Message broker with persistent storage
- **Redpanda Console**: Web UI for managing topics and monitoring
- **Topic Management**: Automated topic creation and configuration
- **test123 Topic**: Pre-configured test topic

## Quick Start

1. **Set default values and secrets:**
   ```bash
   bash .values_and_secrets.defaults.sh
   ```

2. **Run the stack:**
   ```bash
   pt run stack
   ```

3. **Access Redpanda Console:**
   The console will be available at the exposed port for the `redpanda-console` service.

## Components

### Redpanda Module
- Uses `polytope/redpanda` with persistent storage
- Data persisted in `redpanda-data` project-scoped volume
- Exposes Kafka API on port 9092

### Redpanda Console Module
- Web UI for Redpanda management
- Connects automatically to the Redpanda instance
- Configurable port (default: 8080)

### Topic Initialization
- Automated topic creation using `cillers-init`
- Configuration in `conf/init/redpanda.yaml`
- Environment-specific settings support

## Topics

### test123
- **Partitions**: 1 (dev), 3 (staging), 6 (prod)
- **Replication**: 1
- **Retention**: 1 day (dev), 7 days (staging/prod)
- **Cleanup Policy**: delete

## Configuration

### Environment Values
- `environment`: Target environment (dev, test, staging, prod)
- `redpanda_host`: Redpanda service hostname
- `redpanda_port`: Redpanda Kafka port
- `redpanda_console_port`: Console web UI port

### Adding New Topics
Edit `conf/init/redpanda.yaml` to add new topics:

```yaml
topics:
  my-new-topic:
    defaults:
      partitions: 1
      config:
        cleanup.policy: delete
        retention.ms: 86400000
    env_settings:
      prod:
        partitions: 6
        replication: 3
```

### Local Development
For local development with custom values, create `.values_and_secrets.sh` (gitignored):

```bash
#!/bin/bash
pt values set redpanda_console_port "8081"
# Add other custom values...
```

## Python Integration

For Python applications connecting to Redpanda, use:
- **Package**: `kafka-python==2.2.15`
- **Bootstrap servers**: `redpanda:9092`

Example:
```python
from kafka import KafkaProducer, KafkaConsumer

producer = KafkaProducer(bootstrap_servers=['redpanda:9092'])
consumer = KafkaConsumer('test123', bootstrap_servers=['redpanda:9092'])
```

## Architecture

The stack follows Polytope best practices:
- Persistent volumes for stateful services
- Environment-specific configuration
- Fault-tolerant service design
- Automated initialization and setup
