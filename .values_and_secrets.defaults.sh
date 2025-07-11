#!/bin/bash

# Set all Polytope values and secrets for the application

# Frontend configuration (non-secret values)
pt values set frontend_port 3000
pt values set api_port 5000

# Couchbase configuration
pt values set couchbase_host couchbase
pt values set couchbase_bucket_name main

# Couchbase secrets (sensitive information)
pt secrets set couchbase_username admin
pt secrets set couchbase_password password

echo "All Polytope values and secrets have been set successfully!"
