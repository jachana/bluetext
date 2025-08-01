# Documentation for blueprints

When adding a module or template to polytope.yml, always check if there is a blueprint for that type of module or template. 

## Here are tables with a description of the blueprints that exist. 

| Module/Template Type | Blueprint ID | Module/Template |
|----------------------|--------------|-----------------|
| Python API | python-api | Module |
| React app | frontend | Module |
| Redpanda | redpanda | Module |
| Redpanda Console | redpanda-console | Module |
| Couchbase | couchbase | Module |

The blueprints are located at `.blueprints/<Blueprint ID>`

## Context
Always start with reading all the files in the `.blueprints/<Blueprint ID>/context` directory for information about how to add the module or template. 

## Source code boilerplate
If the blueprint has a `/boilerplate` directory, use the boilerplate module to generate the initial code for the module. 

`pt run --non-interactive "boilerplate{blueprint: <Blueprint ID>, path: my-module-code-root-path}"`
