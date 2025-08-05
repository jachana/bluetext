# Bluetext Documentation

Bluetext is an agentic coding assistant framework for building enterprise-grade systems on Polytope. This documentation provides comprehensive guidance for AI coding assistants working with Polytope-based projects.

## Quick Start

1. **Prerequisites**: Install [Polytope](https://docs.cillers.com/polytope) and [Docker](https://orbstack.dev) (OrbStack recommended for Mac)
2. **Core Concepts**: Understand [Polytope platform fundamentals](#polytope-platform)
3. **Choose Your Path**: Select from [available blueprints](#blueprints) or use [standard modules](#standard-modules)
4. **Generate Code**: Use [code generation modules](#code-generation) for boilerplate and package management

## Polytope Platform

Polytope is a container orchestration platform that runs all software components in containers (Docker locally, Kubernetes in cloud). Key concepts:

- **Jobs & Steps**: Computational graphs where each step runs a module
- **Modules**: Reusable code units that interface with Polytope's runner API
- **Templates**: Full job specifications for easy reuse
- **Configuration**: Defined in `polytope.yml` files

**📖 Detailed Documentation**: Access `bluetext://polytope-docs` for comprehensive Polytope documentation including:
- Complete module and template syntax
- Parameter types and validation
- Values and secrets management
- Best practices and patterns

## Blueprints

Pre-built patterns for common application types. Always check for blueprints before creating custom modules.

**📖 Blueprint Overview**: Access `bluetext://blueprints` for complete blueprint documentation

**Available Blueprints**:
- `python-api` - Python API server with boilerplate
- `web-app` - React web application with boilerplate  
- `redpanda` - Kafka-compatible streaming platform
- `redpanda-console` - Redpanda Console
- `couchbase` - Couchbase cluster
- `init` - Data cluster initialization, data structure management and configuration management.

**Usage**: Access documentation for individual blueprints via `bluetext://blueprints/<blueprint-id>`

## Standard Modules

Built-in Polytope modules available without definition in `polytope.yml`. Reference with `polytope/` prefix.

**📖 Module Documentation**: Access `bluetext://polytope/standard-modules/<module-id>` for detailed specs

**Core Modules**:
- `polytope/container` - Base Docker container runner
- `polytope/python` / `polytope/python-simple` - Python applications
- `polytope/node` - Node.js applications
- `polytope/postgres` / `polytope/postgres-simple` - PostgreSQL databases
- `polytope/redpanda` - Kafka-compatible streaming
- `polytope/redpanda-console` - Redpanda management UI
- `polytope/redpanda-connect` - Data streaming pipelines

## Code Generation

Automated tools for common development tasks.

**📖 Module Documentation**: Access `bluetext://code-gen-modules/<module-id>` for usage details

**Available Modules**:
- `boilerplate` - Generate the initial code for a module by cloning a Git repository. Always use this when generating the initial code for a module if there is an applicable boilerplate available.
- `add-package-npm` - Add npm packages to Node.js projects. Always use this instead of adding npm packages yourself. 
- `add-package-python` - Add packages to Python projects. Always use this instead of adding python packages yourself.

## Key Principles for AI Assistants

### File Structure
- Place `templates` section before `modules` in `polytope.yml`
- Keep templates concise, define complexity in modules
- Use `./modules/<module-id>/` for custom module code

### Configuration Management
- **CRITICAL**: Use Polytope values/secrets for all environment-specific data
- No hardcoded ports, hostnames, or credentials in `polytope.yml`
- Values: `pt.value api_port` (non-sensitive)
- Secrets: `pt.secret db_password` (sensitive)

### Service Architecture
- **CRITICAL**: Use persistent volumes for stateful services (databases, queues)
- Services run concurrently by default - avoid `run-when: after` for services
- All code must be resilient to service dependencies being temporarily unavailable

### Type Safety
- Polytope values/secrets are always strings
- Use two-module pattern for type conversion:
  - Top-level module: handles value/secret dereferencing
  - Base module: handles type conversion with `#pt-js`
- **IMPORTANT**: `pt.value` and `pt.secret` not available in `#pt-js` scripts

## Resource Access Pattern
When working with Bluetext documentation:
1. **Start with blueprints**: `bluetext://blueprints/<blueprint-id>`
2. **Reference standard modules**: `bluetext://polytope/standard-modules/<module-id>`
3. **Use code generation**: `bluetext://code-gen-modules/<module-id>`
4. **Consult platform docs**: `bluetext://polytope-docs`

## Workflows

If there is a relevant workflow provided below, you should follow it and make appropriate adjustments based on the  following workflows to comply with the users requests. 

### Adding a new module
1. Check if there is a blueprint for the type of module that is requested using `bluetext://blueprints`. If not, you are on your own and should not continue this process. If there is a blueprint, fetch it: `bluetext://blueprints/<blueprint-id>`.
3. Follow the instructions provided by the blueprint. Run scripts and modules as instructed by the blueprint, don't just tell the user to do that.
4. Specify which blueprint the module is based on in the info section. E.g. `info: "React web application (blueprint: web-app)"`.
5. Verify that you have really followed all the instructions provided by the blueprint. 
6. Check if the generated code fulfills the user's requirements, or if some adjustments need to be made, e.g. some functionality may need to be implemented in the added module's code. 

## Example polytope.yml 
```yaml
templates:
  - id: api-stack
    run:
      - api
      - database

modules:
  - id: api
    module: polytope/python
    args:
      port: pt.value api_port
      code: { type: host, path: ./modules/api }
      
  - id: database
    module: polytope/postgres
    args:
      data-volume:
        type: volume
        scope: project
        id: db-data
```

This structure ensures maintainable, environment-agnostic, and scalable Polytope applications.
