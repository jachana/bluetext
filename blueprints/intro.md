# Documentation for blueprints

When adding a module or template to polytope.yml, always check if there is a blueprint for that type of module or template. 

## Here are tables with a description of the blueprints that exist. 

| Module/Template Type | Blueprint ID | Module/Template | Boilerplate Repository |
|----------------------|--------------|-----------------|------------------------|
| Python API | python-api | Module | https://github.com/Cillers-com/boilerplate-python-api |
| React app | web-app | Module | https://github.com/Cillers-com/boilerplate-react-web-app |
| Redpanda | redpanda | Module | N/A |
| Redpanda Console | redpanda-console | Module | N/A |
| Couchbase | couchbase | Module | N/A |
| Init | init | Module | N/A |

The blueprints are located at `blueprints/<Blueprint ID>`

## Context
Always start by using the MCP server to fetch the appropriate blueprint resource for information about how to add the module or template. Use the `access_mcp_resource` tool with the server name `bluetext` and the URI `bluetext://blueprints/<Blueprint ID>` where `<Blueprint ID>` is the specific blueprint you need (e.g., `bluetext://blueprints/python-api` for the Python API blueprint).

Available blueprint resources:
- `bluetext://blueprints/couchbase` - Couchbase blueprint documentation
- `bluetext://blueprints/init` - Init blueprint documentation  
- `bluetext://blueprints/python-api` - Python API blueprint documentation
- `bluetext://blueprints/redpanda` - Redpanda blueprint documentation
- `bluetext://blueprints/redpanda-console` - Redpanda Console blueprint documentation
- `bluetext://blueprints/web-app` - Web app blueprint documentation

## Source code boilerplate
For blueprints that have boilerplate repositories (Python API and React app), use the `boilerplate` module to generate the initial code for the module. The boilerplate code is downloaded from remote Git repositories.

**Python API:**
`pt run --non-interactive "boilerplate{source-path: https://github.com/Cillers-com/boilerplate-python-api, target-path: my-module-code-root-path}"`

**React app:**
`pt run --non-interactive "boilerplate{source-path: https://github.com/Cillers-com/boilerplate-react-web-app, target-path: my-module-code-root-path}"`

The boilerplate module will download the specified repository and copy the contents to your specified target path. You can use any publicly accessible Git repository as the source-path.
