# Documentation for component templates

When adding a module to polytope.yml, always check if there is a component template for that type of module. 

## Here is a table with a description of the component templates that exist. 

| Component Type | Component Template ID | Has source code scaffolding |
|----------------|-----------------------|-----------------------------|
| Python API | python-api | TRUE |
| React app | frontend | TRUE |

The component templates are located at .component-templates/<Component Template ID>

## Context
Always start with reading all the files in the .component-templates/<Component Template ID>/context for information needed to how to add the component. 

## Source code scaffolding
If the component has source code scaffolding, use the create-component module to generate the scaffolding code for the component. 

`pt run --non-interactive "create-component{template: <Component Template ID>, path: my-component-root-path}"`
