# Instructions to follow when generating code that should run on Polytope

## Format of polytope.yml file
The polytope.yml file must follow the PolytopeFile data type.

## Consice template section
Make the template section of the polytope.yml file as short as possible. Define modules under the modules section or use pre-existing Polytope modules and refer to them from the template run section. 

## No hard coded property values that the user may want to change between deployment environments
In the polytope.yml file, all values that may change between deployment environment should be dynamically loaded from Polytope secrets and values, e.g. all ports, hostnames, and protocols should be stored as Polytope values and all usernames, passwords and api keys should be stored as Polytope secrets. All property values specified in a ServiceSpec or EnvVarSpec should be referenced as Polytope values, e.g. port: "#pt-value api_port". Ensure that no property value inside of a ServiceSpec of EnvVarSpec is hard coded.

## Hostnames
The hostnames that web apps need, must be based on Polytope values, so they can be dynamically set to different values in deployment different environments.

The Polytope service hostnames that are accessible internally within a template are not available to a web browser or any other software running outside of Polytope. 

## Don't wait for non-completion modules.
In Polytope, the container that a module is running in is stopped when the command specified by the cmd parameter runs to completion. That means that any service started by the script will also be shut down when the script completes. 

In a Polytope template that defines a stack of services that should be kept running, no module should wait for other module. 

For example, in the following template the postgres-init module will never run, because the postgres module keeps on running until the whole Polytope job is stopped. 
templates:
  - id: stack
    run:
      - module: postgres
      - module: postgres-init
        run-when:
          after: postgres
          after-condition: success

Instead, start both modules and have the code in the postgres-init module handle that the 
postgres module may not yet be fully up and running. 

## The code must be fault tolerance to handle that other modules may be restarted at any time
The code running in the modules should be fault tolerant in expectation that other modules may not be fully up and running yet and may be restarted. 

## Executables
Ensure that all files to be executed are executable. 

## `src` directory
Store all code to mounted by a module in subdirectories under the `./src` directory.

## Module inheritance

To create a new module you always need to specify another module as parent module in the "module" parameter. 

The base is the polytope/container module. If there is no suitable parent module to inherit from, use the polytope/container module. 

