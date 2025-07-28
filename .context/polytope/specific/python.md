# Directives for Creating Pythons App with Polytope

Create a separate project directory for the app, even if it's the only project you are creating.

For web servers, use uv and fastapi with uvicorn.

Use environment variables for configuration, and make sure to 1. set these in the corresponding Polytope module, and 2. expose them as params in the module.

Generate scaffolding via `uv init --package .` and use `uv add` to install dependencies. DO NOT UNDER ANY CIRCUMSTANCES fill out package versions yourself! Let uv handle this for you or leave the version blank!

Provide a `bin/init` script that sets up the environment and installs dependencies:
```bash
#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
[[ "${TRACE:-}" == true ]] && set -o xtrace

readonly project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
cd "$project_root"

VIRTUAL_ENV="$HOME/.cache/venvs/api"

if ! command -v uv &> /dev/null; then
  PYTHON_CMD="$(command -v python3 || command -v python)"
  echo "Installing uv..."
  $PYTHON_CMD -m pip install -q --disable-pip-version-check --root-user-action=ignore uv
fi

uv sync --no-progress
```

Provide a `bin/run` script that installs deps and runs the app (specify this as the `cmd` in the Polytope module for the app):
```bash
#!/usr/bin/env bash

. "$(dirname "$0")/init"

trap 'jobs -p | xargs -r kill' EXIT

exec uv run my-app
```

Also, while you're at it, create a `bin/ipython` script:
```bash
#!/usr/bin/env bash
. "$(dirname "$0")/init"

exec uv run ipython
```

Make sure you add project.scripts and dev dependencies appropriately in your `pyproject.toml` file.
