#!/usr/bin/env bash

# Default values for the stack template
# Execute this file to set all default values: ./values_and_secrets.defaults.sh

# Frontend configuration
pt value set frontend_port 3000
pt value set frontend_host localhost

# API configuration  
pt value set api_port 4000
pt value set api_host localhost

# Redpanda configuration
pt value set redpanda_host redpanda
pt value set redpanda_port 9092
pt value set redpanda_messages_topic messages
pt value set redpanda_console_port 8080

echo "Default values set successfully!"
echo "You can now run: pt run stack"
