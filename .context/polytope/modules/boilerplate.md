# Documentation for boilerplate module for Generating code from Blueprints

The boilerplate module supports creating the initial scaffolding code and polytope.yml configurations. 

| Module Type | Blueprint ID | Command |
|-------------|--------------|---------|
| React app   | frontend     | `pt run --non-interactive "boilerplate{template: frontend, target-path: module-code-root-path}"` |
| Python API  | python-api   | `pt run --non-interactive "boilerplate{template: python-api, target-path: module-code-root-path}"` |

Before running the boilerplate module to create the boilerplate code and updating the polytope.yml configurations, read the files in the `.blueprints/<blueprint-id>/context` directory. 
