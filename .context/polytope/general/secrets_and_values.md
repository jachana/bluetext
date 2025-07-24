# Documentation for Polytope secrets and values

Polytope supports setting and reading secrets and values. 

## Secrets and values are set using the polytope CLI as follows.  

### pt secret set --help          
Sets the value of a secret.

USAGE
  $ pt secrets set [<secret>] [<data>] [optional flags]

DESCRIPTION
  Sets the value of a secrets.
  Overwrites the value if it already exists.
  
  A specification in YAML/JSON/EDN format must be provided, using one of the
  following methods:
   - stdin (in combination with the `--stdin` flag)
   - a file (in combination with the `--file` flag)
   - the `--spec` flag.

COMMAND OPTIONS
  -c, --context=<context>          Runs as a specific user against a specific Polytope instance.
  -f, --file=<path>                Reads a secret specification from a YAML/JSON/EDN file.
  -o, --output=<(yaml|json|edn)>   Selects output format [default: yaml].
      --pretty                     Pretty-prints output when supported [default: true].
      --stdin                      If selected, reads a secret specification in YAML/JSON/EDN format from stdin.

GLOBAL OPTIONS
      --config-file=<path>   CLI config file path [default: ~/.config/polytope/config.yaml].
  -h, --help                 Prints help for the command.
      --log-file=<path>      Log printing file path [default: ~/.local/state/polytope/cli.log].
  -v, --verbose              Enables log printing in terminal. Raises level of detail in log file.
      --version              Prints the current CLI version.



### pt value set --help.
Sets the value of a values.

USAGE
  $ pt values set [<value>] [<data>] [optional flags]

DESCRIPTION
  Sets the value of a values.
  Overwrites the value if it already exists.
  
  A specification in YAML/JSON/EDN format must be provided, using one of the
  following methods:
   - stdin (in combination with the `--stdin` flag)
   - a file (in combination with the `--file` flag)
   - the `--spec` flag.

COMMAND OPTIONS
  -c, --context=<context>          Runs as a specific user against a specific Polytope instance.
  -f, --file=<path>                Reads a value specification from a YAML/JSON/EDN file.
  -o, --output=<(yaml|json|edn)>   Selects output format [default: yaml].
      --pretty                     Pretty-prints output when supported [default: true].
      --spec=<>                    A a value specification in YAML/JSON/EDN format.
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

    - id: frontend
      args:
        ...
        env: 
            ...
            - { name: API_PROTOCOL, value: pt.value api_protocol }
            - { name: API_HOST, value: pt.value api_host }
            - { name: API_PORT, value: pt.value api_port }

  - id: rpk
    args:
      ...
      env: [{ name: RPK_BROKERS, value: "{pt.value redpanda-host}:{pt.value redpanda-port}" }]


  - id: redpanda-create-topics
    args: 
      ...
      cmd: "topic create {pt.value redpanda-topics}"
          

        
## Sample executable file with default values and secrets

Store all default values and secrets in an executable file `.values_and_secrets.defaults.sh`. This file should contain 
set commands for all values and secrets that are referenced in the polytope.yml file with default values. 

This enables the user to execute that file to set all values and secrets when initializing the project on a new machine. 

Make sure the .secrets_and_values.sh file pattern is added to the .gitignore file, so the user can store real secrets and local variables that should not be checked in in that file.

