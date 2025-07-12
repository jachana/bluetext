# Polytope Module And Template Parameter Reference

## Parameter types

This page lists data types that are used when defining module parameters. Basic types include e.g. strings, booleans, and Polytope-specific data types. Collection types let you create more complex types, e.g. maps, lists, or optional parameters.

## Basic types

| Type | Data Type | Description |
|------|-----------|-------------|
| `absolute-path` | `string` | Absolute filesystem path |
| `bool` | `boolean` | Boolean true/false selection |
| `code` | `Code` | Function to be executed by the runner |
| `docker-image` | `string` | Docker image selection |
| `duration` | `Duration` | Duration of time |
| `env-var` | `EnvVarSpec` | Map containing environment variable name and value |
| `http-method` | `string` | HTTP method selection |
| `int` | `integer` | Integer |
| `mount-source` | `MountSourceSpec` | Mount source selection |
| `num` | `num` | Decimal number |
| `service-ref` | `ServiceRef` | Reference to an existing service |
| `service-spec` | `ServiceSpec` | Full specification of a service |
| `str` | `string` | String |
| `url-path` | `string` | URL path fragment |

## Collection types

### default
*Defaults to a given value when none is provided*

**Description**
Allows you to specify a type along with a default value matching the type. If no input is provided, the default value is used.

**Examples**
- `["default","str","my-default-string"]`
- `["default","int",0]`

### either
*Allows any of the specified types*

**Description**
Allows you to specify several accepted types

**Examples**
- `["either","str","int"]`
- `["either","str",["str"]]`

### enum
*Allows any of the specified strings*

**Description**
Allows you to specify any number of allowed strings.

**Examples**
- `"enum"`
- `"allowed-string-1"`
- `"allowed-string-2"`

### list
*List of values of a type*

**Description**
Allows lists of any types.

**Examples**
- `["str"]`
- `["int"]`

### map
*Map from specified keys to value types*

**Description**
Allows you to require a map with specified keys, with any type specified as their values.

**Examples**
- `{"my-key-1":"str","my-key-2":"int"}`

### maybe
*Optional parameter*

**Description**
Allows you to specify optional parameters.

**Examples**
- `["maybe","str"]`
- `["maybe","int"]`

### regex
*Regular expression*

**Description**
Allows you to require string inputs to match the specified regex.

**Examples**
- `["regex","my-string-.*"]`
