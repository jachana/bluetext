# Documentation for create-component tool for Generating code from templates

The create-component module supports creating the initial scaffolding code and polytope.yml configurations. 

| Component Type | Component Template ID | Command |
|----------------|-----------------------|---------|
| React app      | frontend              | `pt run --non-interactive "create-component{template: frontend, path: my-component-root-path}"` |
| Python API     | python-api            | `pt run --non-interactive "create-component{template: python-api, path: my-component-root-path}"` |

Before running the create-component module to create the scaffolding code and settings the polytope.yml configurations, read the files in the .component-templates/<componend-template-id>/context directory. 
