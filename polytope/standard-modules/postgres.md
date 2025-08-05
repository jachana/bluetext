# polytope/postgres

Runs a PostgreSQL database container with full configuration options.

## Module Specification

```yml
info: Runs a PostgreSQL container.
id: postgres
params:
- id: image
  info: The Docker image to run.
  name: Image
  type: [default, docker-image, 'public.ecr.aws/docker/library/postgres:16.2']
- id: container-id
  info: The ID to use for the container.
  name: Container ID
  type: [default, str, postgres]
- id: data-volume
  name: Data Volume
  info: The volume (if any) to mount for data.
  type: [maybe, mount-source]
- id: service-id
  info: The ID to use for the service.
  name: Service ID
  type: [default, str, postgres]
- id: env
  info: Environment variables to pass to the server.
  name: Environment variables
  type:
  - maybe
  - [env-var]
- id: cmd
  info: The command to run in the container. If unspecified, runs the PostgreSQL server.
  name: Command
  type:
  - maybe
  - - either
    - str
    - - [maybe, str]
- id: restart
  info: What policy to apply on restarting containers that fail.
  name: Restart policy
  type:
  - maybe
  - policy: [enum, always, on-failure]
    max-restarts: [maybe, int]
- id: scripts
  info: SQL files to run when initializing the DB.
  name: Scripts
  type:
  - maybe
  - [mount-source]
module: polytope/container
args:
  image: pt.param image
  id: pt.param container-id
  mounts: |-
    #pt-clj (concat
     (when-let [v (:data-volume params)]
      [{:path "/var/lib/postgresql/data", :source v}])
     (for [s (:scripts params)]
      {:path   "/docker-entrypoint-initdb.d/data-backup.sql"
       :source s}))
  env: pt.param env
  tty: '#pt-clj (empty? (:scripts params))'
  restart: pt.param restart
  services:
  - id: pt.param service-id
    ports:
    - {protocol: tcp, port: 5432}
```

## Description

This module provides a full-featured PostgreSQL database server with support for custom configuration, initialization scripts, and persistent data storage.

## Parameters

- **image**: The Docker image to use (default: `public.ecr.aws/docker/library/postgres:16.2`)
- **container-id**: Container identifier (default: `postgres`)
- **data-volume**: Optional volume for persistent data storage
- **service-id**: Service identifier (default: `postgres`)
- **env**: Environment variables for database configuration (e.g., POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD)
- **cmd**: Optional custom command to run instead of the default PostgreSQL server
- **restart**: Container restart policy
- **scripts**: Optional SQL scripts to run during database initialization

## Services

The module exposes:

- **postgres** (port 5432): PostgreSQL database connection

## Usage Example

```yaml
modules:
  - id: database
    module: polytope/postgres
    args:
      data-volume:
        type: volume
        scope: project
        id: postgres-data
      env:
        - name: POSTGRES_DB
          value: myapp
        - name: POSTGRES_USER
          value: appuser
        - name: POSTGRES_PASSWORD
          value: pt.secret postgres_password
      scripts:
        - type: host
          path: ./sql/init.sql

templates:
  - id: app-stack
    run:
      - database
```

## Environment Variables

Common PostgreSQL environment variables:

- **POSTGRES_DB**: Default database name
- **POSTGRES_USER**: Default user name
- **POSTGRES_PASSWORD**: Password for the default user
- **POSTGRES_INITDB_ARGS**: Additional arguments for initdb
- **POSTGRES_INITDB_WALDIR**: Custom location for transaction log
- **POSTGRES_HOST_AUTH_METHOD**: Authentication method (e.g., `trust`, `md5`)
