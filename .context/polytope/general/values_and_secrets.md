# Documentation for Polytope secrets and values

Polytope supports setting and reading secrets and values. 

## Secrets and values are set using the polytope CLI as follows.  

### pt secret set --help          
Sets the value of a secret.

USAGE
  $ pt secrets set [<secret-id>] [<data>] [optional flags]

DESCRIPTION
--  Sets the value of a secret.
  Overwrites the value if it already exists.
  
  A specification in YAML/JSON/EDN format must be provided, using one of the
  following methods:
   - stdin (in combination with the `--stdin` flag)
   - a file (in combination with the `--file` flag)

COMMAND OPTIONS
  -c, --context=<context>          Runs as a specific user against a specific Polytope instance.
  -f, --file=<path>                Reads a secret specification from a YAML/JSON/EDN file.
  -o, --output=<(yaml|json|edn)>   Selects output format [default: yaml].
      --pretty                     Pretty-prints output when supported [default: true].
  -r, --raw                        If the data is a string, number, or boolean, prints it as a raw string.
      --stdin                      If selected, reads a secret specification in YAML/JSON/EDN format from stdin.

GLOBAL OPTIONS
      --config-file=<path>   CLI config file path [default: ~/.config/polytope/config.yaml].
  -h, --help                 Prints help for the command.
      --log-file=<path>      Log printing file path [default: ~/.local/state/polytope/cli.log].
  -v, --verbose              Enables log printing in terminal. Raises level of detail in log file.
      --version              Prints the current CLI version.

### pt value set --help.
Sets the value of a value.

USAGE
  $ pt values set [<value-id>] [<data>] [optional flags]

DESCRIPTION
  Sets the value of a value.
  Overwrites the value if it already exists.
  
  A specification in YAML/JSON/EDN format must be provided, using one of the
  following methods:
   - stdin (in combination with the `--stdin` flag)
   - a file (in combination with the `--file` flag)

COMMAND OPTIONS
  -c, --context=<context>          Runs as a specific user against a specific Polytope instance.
  -f, --file=<path>                Reads a value specification from a YAML/JSON/EDN file.
  -o, --output=<(yaml|json|edn)>   Selects output format [default: yaml].
      --pretty                     Pretty-prints output when supported [default: true].
  -r, --raw                        If the data is a string, number, or boolean, prints it as a raw string.
      --stdin                      If selected, reads a value specification in YAML/JSON/EDN format from stdin.

GLOBAL OPTIONS
      --config-file=<path>   CLI config file path [default: ~/.config/polytope/config.yaml].
  -h, --help                 Prints help for the command.
      --log-file=<path>      Log printing file path [default: ~/.local/state/polytope/cli.log].
  -v, --verbose              Enables log printing in terminal. Raises level of detail in log file.
      --version              Prints the current CLI version.


## Secrets and values are dereferenced in the polytope.yml file as follows

The value of a map pair can be specified as the data for a value or a secret. E.g. 

modules: 
    ...

    - id: couchbase
      args:
        ... 
        env:
            ...
            - { name: COUCHBASE_HOST, value: pt.value couchbase_host }
            - { name: COUCHBASE_USERNAME, value: pt.secret couchbase_username }
            - { name: COUCHBASE_PASSWORD, value: pt.secret couchbase_password }

    - id: web-app
      args:
        ...
        env: 
            ...
            - { name: API_PROTOCOL, value: pt.value api_protocol }
            - { name: API_HOST, value: pt.value api_external_host }
            - { name: API_PORT, value: pt.value api_port }

  - id: redpanda-console
    args:
      ...
      env: [{ name: REDPANDA_BROKERS, value: "{pt.value redpanda-host}:{pt.value redpanda-port}" }]

        
## Sample executable file with default values and secrets
Store all default values and secrets in an executable file `.values_and_secrets.defaults.sh`. This file should contain 
set commands for all values and secrets that are referenced in the polytope.yml file with default values. 

This enables the user to execute that file to set all values and secrets when initializing the project on a new machine. 

Make sure the .secrets_and_values.sh file pattern is added to the .gitignore file, so the user can store real secrets and local variables that should not be checked in in that file.

## Polytope values and secrets are stored as strings
When dereferencing a Polytope value or secret in the `polytope.yml` file, the dereferenced type will always be a string, even if it was set to be an int. 

So, when dereferencing a value or a secret in `polytope.yml` you need to use the following best-practice workaround: 
Create two modules: one top-level module and a base-level module. 

### Top-level module
The top-level module uses the base-level module as `module`. It dereferences the needed Polytope values and passes them on to the base module as args. 

### Base-level module
This base-level module does everything else needed for the module to run properly. It exposes as params the values needed to convert from strings to other types, such as ints. It then converts those params to the appropriate types in the args values.

### Example

✅ **CORRECT**:
```yaml
templates: 
  - id: stack
    run:
      - redpanda-console

modules: 
  - id: redpanda-console
    info: Redpanda Console web UI
    module: redpanda-console-base
    args:
      port: pt.values redpanda_console_port
      redpanda-port: pt.values redpanda_port

  - id: redpanda-console-base
    info: Redpanda Console web UI
    module: polytope/redpanda!console
    params:
      - id: port
        type: [default, str, "8080"]
      - id: redpanda-port
        type: [default, str, "9092"]
    args:
      brokers:
        - host: pt.value redpanda_host
          port: "#pt-js parseInt(params['redpandaPort'])"
      admin-url: "http://{pt.value redpanda_host}:9644"
      port: "#pt-js parseInt(params['port'])"
```

Notice that the top-level module specifies the base-level module as it's parent module. 

Notice the the base-level module dereferences the redpanda_host value since it's ok as a str. 

Both of the port args are required by the polytope/redpanda!console to be of type int. 

Notice that the conversion happens in a `#pt-js` script, in which the module params are accessible in the `params` map. And notice that param keys are converted from snakecase and dashcase to camelcase. 

**IMPORTANT `pt.value` is not available within `#pt-js` scripts, only `params`.**

❌ **WRONG**:
```yaml
  expose-as: "#pt-js parseInt(pt.value('api_port'))" # There is no `value` property in the pt object within a #pt-js script.
```

❌ **WRONG**:
```yaml
modules:
  - id: api
    services:
      - id: api
        ports:
          - port: 8888
            protocol: http
            expose-as: "#pt-js parseInt(params['api_port'])" # This will throw an error becuase there is no param 'api_port' specified for this module.
```

✅ **CORRECT**:
```yaml
modules:
  - id: api
    module: api-base
    args:
      - id: port
        value: pt.value port 

  - id: api-base
    params:
      - id: port
        type: [default, str, "4000"]
    env:
      - id: port
        value: 8888
    services:
      - id: api-base
        ports:
          - port: 8888
            protocol: http
            expose-as: "#pt-js parseInt(params['port'])"
```




