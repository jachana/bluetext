#!/bin/bash

# Default values and secrets for Polytope Redpanda setup
# Execute this file to set default values: bash .values_and_secrets.defaults.sh

echo "Setting default Polytope values and secrets..."

# Environment configuration
pt values set environment "dev"

# Redpanda configuration
pt values set redpanda_host "redpanda"
pt values set redpanda_port "9092"

# Redpanda Console configuration  
pt values set redpanda_console_port "8080"

echo "Default values set successfully!"
echo ""
echo "You can now run the stack with: pt run stack"
echo "Redpanda Console will be available at the exposed port for redpanda-console service"
