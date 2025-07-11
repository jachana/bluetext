# Polytope Values and Secrets Migration Summary

This document summarizes the changes made to move all environment-dependent values to Polytope values and secrets, with proper distinction between non-sensitive and sensitive data.

## Changes Made

### 1. Updated polytope.yml
All hardcoded environment-dependent values have been replaced with Polytope secret references:

**Frontend module:**
- `PORT`: Now uses `#pt-value frontend_port` (non-sensitive)
- Added `REACT_APP_API_PORT`: Uses `#pt-value api_port` (non-sensitive)
- Service ports: Now use `#pt-value frontend_port` (non-sensitive)

**API module:**
- `PORT`: Now uses `#pt-value api_port` (non-sensitive)
- `COUCHBASE_HOST`: Now uses `#pt-value couchbase_host` (non-sensitive)
- `COUCHBASE_USERNAME`: Now uses `#pt-secret couchbase_username` (sensitive)
- `COUCHBASE_PASSWORD`: Now uses `#pt-secret couchbase_password` (sensitive)
- `COUCHBASE_MAIN_BUCKET_NAME`: Now uses `#pt-value couchbase_bucket_name` (non-sensitive)
- Service ports: Now use `#pt-value api_port` (non-sensitive)

**Couchbase-init module:**
- `COUCHBASE_HOST`: Now uses `#pt-value couchbase_host` (non-sensitive)
- `COUCHBASE_USERNAME`: Now uses `#pt-secret couchbase_username` (sensitive)
- `COUCHBASE_PASSWORD`: Now uses `#pt-secret couchbase_password` (sensitive)
- `COUCHBASE_MAIN_BUCKET_NAME`: Now uses `#pt-value couchbase_bucket_name` (non-sensitive)

### 2. Updated frontend/src/App.js
- Modified the API URL construction to use the `REACT_APP_API_PORT` environment variable
- Added fallback to port 5000 if the environment variable is not set

### 3. Updated .values_and_secrets.defaults.sh
Created a comprehensive script to set all required Polytope values and secrets:

**Values (non-sensitive):**
- `frontend_port`: 3000
- `api_port`: 5000
- `couchbase_host`: couchbase
- `couchbase_bucket_name`: main

**Secrets (sensitive):**
- `couchbase_username`: admin
- `couchbase_password`: password

## Values and Secrets Defined

The following values and secrets are now managed by Polytope:

### Values (Non-sensitive configuration)
| Value Name | Default Value | Description |
|------------|---------------|-------------|
| `frontend_port` | 3000 | Port for the React frontend application |
| `api_port` | 5000 | Port for the Python API server |
| `couchbase_host` | couchbase | Hostname for the Couchbase database |
| `couchbase_bucket_name` | main | Name of the main Couchbase bucket |

### Secrets (Sensitive information)
| Secret Name | Default Value | Description |
|-------------|---------------|-------------|
| `couchbase_username` | admin | Username for Couchbase authentication |
| `couchbase_password` | password | Password for Couchbase authentication |

## Usage Instructions

1. **Set the values and secrets** by running the provided script:
   ```bash
   chmod +x .values_and_secrets.defaults.sh
   ./.values_and_secrets.defaults.sh
   ```

2. **Verify values and secrets are set** (optional):
   ```bash
   pt values list
   pt secrets list
   ```

3. **Run the application** as usual:
   ```bash
   pt run stack
   ```

## Benefits

- **Environment flexibility**: Easy to change configuration for different environments (dev, staging, prod)
- **Security**: Sensitive values like passwords are managed securely through Polytope secrets, while non-sensitive configuration uses values
- **Maintainability**: All configuration is centralized and can be updated without modifying code
- **Consistency**: All modules now use the same configuration approach
- **Proper separation**: Clear distinction between sensitive (secrets) and non-sensitive (values) configuration

## Customization

To change any configuration value, update the corresponding value or secret:

```bash
# Example: Change API port to 8000 (non-sensitive value)
pt values set api_port 8000

# Example: Change Couchbase password (sensitive secret)
pt secrets set couchbase_password your_secure_password

# Example: Change Couchbase host (non-sensitive value)
pt values set couchbase_host my-couchbase-server
```

After updating values or secrets, restart the affected modules for changes to take effect.
