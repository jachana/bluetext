# Documentation on how to create a React app on Polytope

## Create the "fontend" React app with the desired functionality

* Create the directory "frontend" or what the user wants to call it. 
* Generate a React app in the "frontend" directory.
* Don't install the node modules on the local machine. 

## Create the following executable file

<file path="./frontend/bin/run" mod="x">
#!/usr/bin/env bash

. "$(dirname "$0")/init"

exec npm run start
</file>

### Create the following executable file

<file path="./frontend/bin/init" mod="x">
#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
[[ "${TRACE:-}" == true ]] && set -o xtrace

# NOTE: react-scripts is unmaintained, so gives lots of deprecation warnings
npm install 2> >(grep -v warning 1>&2)
</file>


