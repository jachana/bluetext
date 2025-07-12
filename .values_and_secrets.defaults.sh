#!/usr/bin/env bash

# Default values and secrets for the Polytope stack
# Execute this script to set default values for development

echo "Setting default Polytope values and secrets..."

# Couchbase configuration
pt value set couchbase_host "couchbase"
pt value set couchbase_port "8091"
pt value set couchbase_ssl_port "18091"
pt value set couchbase_bucket_name "main"
pt value set couchbase_tls "false"
pt value set couchbase_type "server"

# API configuration
pt value set api_protocol "http"
pt value set api_host "api"
pt value set api_port "4000"

# Frontend configuration
pt value set frontend_port "3000"

# Secrets (use default values for development)
pt secret set couchbase_username "admin"
pt secret set couchbase_password "password"

echo "✔ Default values and secrets have been set."
echo "For production, update the secrets with real values:"
echo "  pt secret set couchbase_username <your-username>"
echo "  pt secret set couchbase_password <your-password>"
