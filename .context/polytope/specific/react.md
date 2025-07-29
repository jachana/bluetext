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

## Create the following executable file

<file path="./frontend/bin/init" mod="x">
#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
[[ "${TRACE:-}" == true ]] && set -o xtrace

# NOTE: react-scripts is unmaintained, so gives lots of deprecation warnings
npm install 2> >(grep -v warning 1>&2)
</file>


## Common Code Generation Errors

Make sure to check that the following is done correctly: 

- __Create tsconfig.json__: Add a proper TypeScript configuration file for the React project with correct JSX settings and module resolution options.

- __App import statement__: Use `import App from './App.tsx'` to be explicit about the file extension to avoid webpack compilation error.

- __Create package.json__: Add a proper package.json file.

- __Serve static files__: Static files should be served from the public directory. Make sure that the files exist. 
