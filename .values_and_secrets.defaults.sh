#!/bin/bash

# Default values for the stack template
# Execute this file to set default values: ./values_and_secrets.defaults.sh

pt value set frontend_port 3000
pt value set api_port 4000
pt value set api_url "http://localhost:4000"
pt value set redpanda_bootstrap_servers "redpanda:9092"
pt value set redpanda_console_port 8079

echo "Default values have been set successfully!"
