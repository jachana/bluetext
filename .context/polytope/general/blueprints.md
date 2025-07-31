# Documentation for blueprints

When adding a module to polytope.yml, always check if there is a blueprint for that type of module. 

## Here is a table with a description of the blueprints that exist. 

| Module Type | Blueprint ID |
|-------------|--------------|
| Python API | python-api |
| React app | frontend |

The blueprints are located at `.blueprints/<Blueprint ID>`

## Context
Always start with reading all the files in the `.blueprints/<Blueprint ID>/context` directory for information needed to how to add the module. 

## Source code boilerplate
If the blueprint has a `/boilerplate` directory, use the boilerplate module to generate the initial code for the module. 

`pt run --non-interactive "boilerplate{blueprint: <Blueprint ID>, path: my-module-code-root-path}"`
