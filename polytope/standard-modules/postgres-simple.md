# polytope/postgres!simple

Runs a PostgreSQL container with minimal configuration for development use.

## Module Specification

```yml
info: Runs a PostgreSQL container with minimal configuration.
id: simple
params:
- id: image
  info: The Docker image to run.
  name: Image
  type: [default, docker-image, 'postgres:15.4']
- id: scripts
  info: SQL files to run when initializing the DB.
  name: Scripts
  type:
  - maybe
  - [mount-source]
- id: data-volume
  name: Data Volume
  info: The volume (if any) to mount for data.
  type: [maybe, mount-source]
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
module: polytope/container
args:
  image: pt.param image
  id: pt.param id
  mounts: |-
    #pt-clj (concat
     (when-let [v (:data-volume params)]
      [{:path "/var/lib/postgresql/data", :source v}])
     (for [s (:scripts params)]
      {:path   "/docker-entrypoint-initdb.d/data-backup.sql"
       :source s}))
  env:
  - {name: POSTGRES_HOST_AUTH_METHOD, value: trust}
  tty: '#pt-clj (empty? (:scripts params))'
  restart: pt.param restart
  services:
  - id: postgres
    ports:
    - {protocol: tcp, port: 5432}
```

## Description

This module provides a simplified PostgreSQL database server with minimal configuration, ideal for development and testing. It uses trust authentication by default, eliminating the need for passwords.

## Parameters

- **image**: The Docker image to use (default: `postgres:15.4`)
- **scripts**: Optional SQL scripts to run during database initialization
- **data-volume**: Optional volume for persistent data storage
- **restart**: Container restart policy

## Services

The module exposes:

- **postgres** (port 5432): PostgreSQL database connection

## Usage Example

```yaml
modules:
  - id: dev-db
    module: polytope/postgres!simple
    args:
      data-volume:
        type: volume
        scope: project
        id: dev-postgres-data
      scripts:
        - type: host
          path: ./sql/schema.sql

templates:
  - id: dev-stack
    run:
      - dev-db
```

## Key Features

- **Trust Authentication**: No password required for connections
- **Minimal Setup**: Ready to use with minimal configuration
- **Development Focused**: Optimized for local development workflows
- **Script Support**: Automatic execution of initialization scripts

## Security Note

This module uses `POSTGRES_HOST_AUTH_METHOD=trust` which allows connections without authentication. This is suitable for development environments but should not be used in production.
