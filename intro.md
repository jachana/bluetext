# Bluetext Documentation

## Intro

Bluetext provides documenation for how to build software systems on Polytope. Bluetext consists of two concepts: Blueprints and Code Generation Modules.

### Blueprints

Blueprints are instructions for how to add a certain type of module to Polytope. The purpose of Blueprints is to enable you to reliably and efficiently generate the infrastructure needed to provide certain types of applications, functionality and servers. 

#### Available Blueprints

| Blueprint ID       | Description                                              |
|--------------------|----------------------------------------------------------|
| python-api         | Python API server with boilerplate                       |
| web-app            | React web application with boilerplate                   |
| redpanda           | Kafka-compatible streaming platform                      |
| redpanda-console   | Redpanda Console                                         |
| couchbase          | Couchbase cluster                                        |
| init               | Data cluster initialization, data structure management and configuration management |

#### MCP Intro Documentation For Individual Blueprints

The intro documentation for each Blueprint is available at the MCP resource `bluetext://blueprints/<blueprint-id>`. 

To use a Blueprint you must first read its documentation resource and follow its instructions. 

### Code Generation Modules

Code Geneation Modules are Polytope modules that generate code reliably and efficiently. Blueprints may provide instructions to use different code generation modules for different code generation purposes. 


#### Available Code Generation Modules

| Module ID           | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| boilerplate         | Generate the initial code for a module by cloning a Git repository. Always use this when generating the initial code for a module if there is an applicable boilerplate available. |
| add-package-npm     | Add npm packages to Node.js projects. Always use this instead of adding npm packages yourself. |
| add-package-python  | Add packages to Python projects. Always use this instead of adding python packages yourself. |


#### MCP Intro Documentation For Individual Code Generation Modules

Before using a Code Generation Module, you must read the documentation for it and follow its instructions. 

The intro documentation for each Code Generation Module is available at the MCP resource `bluetext://code-gen-modules/<module-id>`. 

**WRONG: Running a code generation module, without first reading the documentaiton for it. E.g. running `pt run add-package-python` without first reading `bluetext://code-gen-modules/add-package-python`. You will fail if you try this.**

**CORRECT: First reading the documentation for the code generation module and then running it in accordance with the documentation.**


## Polytope

Polytope is a container orchestration platform that runs all software components in containers (Docker locally, Kubernetes in cloud). 

### MCP Intro Documentation For Polytope
Read the Polytope intro documentation resource at `bluetext://polytope-docs` to understand how Polytope works.

Contents of this documentation includes: 
- Complete module and template syntax
- Parameter types and validation
- Values and secrets management
- Best practices and patterns

### Command-Line Interface (CLI)

Polytope is managed with a CLI called `pt` that is available in the user's terminal. 

### Key Concepts

| Concept          | Description                                            |
|------------------|--------------------------------------------------------|
| Jobs & Steps     | Computational graphs where each step runs a module     |
| Modules          | Reusable code units that interface with Polytope's runner API |
| Templates        | Full job specifications for easy reuse                 |
| Modules And Templates Configuration | Specified in the`./polytope.yml` file                       |
| Values           | Values can be set by the CLI and referenced in the `./polytope.yml` file. |
| Secrets          | Like values but with extra security measures. |

### Modules And Templates Configuration File 

The modules and templates are specified in the `polytope.yml` configuration file.

The templates should be specified as consicely as possible. Keep the complexity defined in modules.

The templates should be specified before the modules. 

### Example polytope.yml 
```yaml
templates:
  - id: api-stack
    run:
      - api
      - database

modules:
  - id: api
    module: polytope/python
    info: "Python API server (blueprint: python-api)"
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


### Module Parameters

The `params` attribute specifies which parameters the module should be instantiated with. Parameters with a `default` value do not need to be provided when instantiating the module.

### Parent Modules

Every Polytope, except the `polytope/container` module, has a parent module that is specified in the module attribute. 

E.g. 
```yaml
modules:
  - id: api
    module: polytope/python # Parent module
```

The `args` attribute specifies which parameters to instantiate the parent module with. 

### Module Custom Code

Modules can mount code into their containers. The modules' custom code should be located in `./modules/<module-id>/` directories. 

### Values And Secrets

Use Polytope values/secrets for all environment-specific data. No hardcoded ports, hostnames, or credentials in `polytope.yml`

Values are set with the CLI's `values set` command, e.g. `pt values set api_port 4000` and referenced in the `./polytope.yml` file with the `pt.value <value_key>` syntax, e.g. `pt.value api_port`. 
Secrets are set with the CLI's `secrets set` command, e.g. `pt secrets set couchbase_password pa55w0rd` and referenced in the `./polytope.yml` file with the `pt.secret <value_key>` syntax, e.g. `pt.secret couchbase_password`. 

#### Type Conversion of Valus And Secrets
Polytope values and secrets are always strings.

Use two-module pattern for type conversion:
- Top-level module: handles value/secret dereferencing
- Base module: handles type conversion with `#pt-clj`

**Important: `pt.value` and `pt.secret` is not available in `"#pt-clj "` scripts, e.g. `"#pt-clj (Integer/parseInt (pt.value "port"))"` will not work.**

### Persistent Volumes

Use persistent volumes for stateful services (databases, queues)

### `run-when`

Services run concurrently by default - avoid `run-when: after` for services

### Dependency Resilience
All code must be resilient to service dependencies being temporarily unavailable

### Polytope Standard Modules

Polytope has built-in standard modules that are available even without definition in `polytope.yml`. The standard modules should be referenced with the `polytope/` prefix.

#### Available Standard Modules

| Module ID                    | Description                        |
|------------------------------|------------------------------------|
| polytope/container           | Base Docker container runner       |
| polytope/python              | Python applications                |
| polytope/python!simple       | Python applications                |
| polytope/node                | Node.js applications               |
| polytope/postgres            | PostgreSQL databases               |
| polytope/postgres!simple     | PostgreSQL databases               |
| polytope/redpanda            | Kafka-compatible streaming         |
| polytope/redpanda!console    | Redpanda management UI             |
| polytope/redpanda!connect    | Data streaming pipelines           |


#### MCP Intro Documentation For Individual Standard Modules

To use a standard module you must first read its documentation resource at `bluetext://polytope/standard-modules/<module-id>`. 

## Workflows

If there is a relevant workflow provided below, you should follow it and make appropriate adjustments based on the following workflows to comply with the users requests. 

### Adding a new Polytope module
1. Check if there is a blueprint for the type of module that is requested by reading the Blueprints intro documentation resource `bluetext://blueprints`. 
2. If there is no relevant Blueprint, you are on your own and should not continue this workflow. If there is a blueprint, read it's documentation resource at `bluetext://blueprints/<blueprint-id>`.
3. If the blueprint contains instructions to run a code-gen-module, fetch the documentation for it `bluetext://code-gen-modules/<module-id>`.
4. Follow the instructions provided by the blueprint. Run scripts and modules as instructed by the blueprint, don't just tell the user to do that.
5. Specify which blueprint the module is based on in the info section. E.g. `info: "React web application (blueprint: web-app)"`.
6. Check if the generated code fulfills the user's requirements, or if some adjustments need to be made, e.g. some functionality may need to be implemented in the added module's code. 
7. If the values_and_secrets.defaults.yaml script was updated, run it, don't just tell the user to do it.

### Updating a Polytope module
1. Check if the module is based on a Blueprint by checking if the `info` attribute contains a specification of which blueprint it is based on, e.g. `info: ... (blueprint: web-app)`. 
2. If it does not specify that it is based on a blueprint, you are on your own and should not continue this workflow. If it is based on a blueprint, read it's documentation resources at `bluetext://blueprints/<blueprint-id>`.
3. Follow all the instructions that are relevant to updating the module.
