# Directives for Creating Pythons App with Polytope

Create a separate project directory for the app, even if it's the only project you are creating.

For web servers, use uv and fastapi with uvicorn.

Use environment variables for configuration, and make sure to 1. set these in the corresponding Polytope module, and 2. expose them as params in the module.

Create the project via `pt run create-subproject{template: python-api, path: my-project-path}` and use `uv add` to install dependencies. DO NOT UNDER ANY CIRCUMSTANCES fill out package versions yourself! Let uv handle this for you or leave the version blank!

Make sure you add project.scripts and dev dependencies appropriately in your `pyproject.toml` file.
