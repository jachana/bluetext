# Polytope Data Types Documentation

This document provides detailed descriptions of various data types used in Polytope, based on the provided EDN definitions.

## Code

**Type:** str

**Summary:** Representation of code

**Details:** The runner API allows running arbitrary JavaScript, Python, and Clojure code.

Code is allowed in string format, prefixed with a language identifier:
- JavaScript: `#pt-js`.
- Python: `#pt-py`.
- Clojure: `#pt-clj`.

Alternatively, Clojure code forms can be supplied as-is when supplied via an EDN file.

**Examples:**
- `"#pt-js 5 + 3"`
- `"#pt-py 5 + 3"`
- `"#pt-clj (+ 5 3)"`
- `(+ 5 3)`

**Components:**
- Kind: either
- Type: str
- Cases:
  - Type: str (ID: arg0)
  - Type: any (ID: arg1)

## ContainerRef

**Type:** str

**Summary:** Reference to a container

**Details:** Used to identify a container in a human-readable way, as an alternative to [pt-ref:Uid]()s.

For containers **within the active job**, the container's [pt-ref:Id]() is used.

For **any container**, the format `$project-ref>$job-id%$container-id` is used, with the project's [pt-ref:ProjectRef]().

**Examples:**
- `my-container`
- `my-org/my-project>my-job%my-container`

## ContainerSpec

**Type:** map

**Summary:** Specification for a container

**Details:** Specifies a container that can be spawned in a job.

**Components:**
- Kind: map
- Keys:
  - **cmd** (Type: str, Optional: true, Maybe: true)
    - Description: Command to be run.
    - Details: Optionally accepts the command in array format (i.e. as an array of strings).
  - **entrypoint** (Type: str, Optional: true, Maybe: true)
    - Description: Container entrypoint.
    - Details: Provided as an array of maps containing entrypoint specifications, in the order of the entrypoint arguments.
  - **env** (Type: array, Optional: true, Maybe: true)
    - Description: Container environment variables.
    - Details: Provided as an array of maps containing environment variable specifications.
    - Components:
      - Kind: list
      - Items:
        - Type: map (Maybe: true)
        - Pt-type: EnvVarSpec
  - **id** (Type: str, Optional: true, Maybe: true)
    - Description: Container ID.
    - Pt-type: Id
  - **image** (Type: str)
    - Description: Name of the Docker image.
  - **mounts** (Type: array, Optional: true, Maybe: true)
    - Description: Container mount specifications, provided in an array.
    - Components:
      - Kind: list
      - Items:
        - Type: map (Maybe: true)
        - Components:
          - Kind: map
          - Keys:
            - **path** (Type: str)
              - Description: Path in the container for the mount.
            - **source** (Type: map)
              - Description: Mount source.
              - Pt-type: MountSourceSpec
  - **no-stdin** (Type: bool, Optional: true, Maybe: true)
    - Description: Whether to *not* open stdin for the container (default is to open stdin).
  - **ports** (Type: array, Optional: true, Maybe: true)
    - Description: Container ports.
    - Details: Provided as an array of maps containing port specifications.
    - Components:
      - Kind: list
      - Items:
        - Type: map (Maybe: true)
        - Components:
          - Kind: map
          - Keys:
            - **id** (Type: str)
              - Description: Port ID.
              - Pt-type: Id
            - **port** (Type: int)
              - Description: Container port number.
  - **restart** (Type: map, Optional: true, Maybe: true)
    - Description: Restart policy.
    - Components:
      - Kind: map
      - Keys:
        - **max-restarts** (Type: int, Optional: true, Maybe: true)
          - Description: The maximum number of restarts.
        - **policy** (Type: str)
          - Description: Restart policy.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "always"
              - Type: str, Value: "never"
              - Type: str, Value: "on-failure"
  - **tags** (Type: map, Optional: true, Maybe: true)
    - Description: Key–value tags for grouping containers.
    - Details: Provided as a map of tag keys and values.
    - Components:
      - Kind: map
      - Keys:
        - **Key Type:** str (Key Doc: Tag key., Key Pt-type: Id, Pt-type: Id)
          - Description: Tag value.
  - **tty** (Type: bool, Optional: true, Maybe: true)
    - Description: Whether the container should be run as a TTY.
    - Details: This corresponds to Docker's `--tty`/`-t` option.
  - **update-image** (Type: bool, Optional: true, Maybe: true)
    - Description: Whether the container image should be checked for updates on start.
    - Details: Otherwise, the runner uses any already cached image.
  - **user** (Type: str, Optional: true, Maybe: true)
    - Description: Execution UID or username used when running the container's processes.
    - Details: Special value `#pt-host` defaults to the UID/GID of the user executing the command in the CLI.
    - Components:
      - Kind: either
      - Type: str
      - Cases:
        - Type: str (ID: arg0)
        - Type: int (ID: arg1)
        - Type: str (ID: arg2)
  - **workdir** (Type: str, Optional: true, Maybe: true)
    - Description: The container's working directory, in which Docker commands will be run.
    - Details: Provided as an absolute path – i.e. a path that begins with `/`.

## ContainerSummary

**Type:** map

**Summary:** Container metadata summary

**Details:** Summary as returned when querying for containers, or as part of e.g. a [pt-ref:JobSummary](). Does not contain the actual container.

**Components:**
- Kind: map
- Keys:
  - **created-by** (Type: map)
    - Description: Information about what or who created the container.
    - Components:
      - Kind: map
      - Keys:
        - **job** (Type: map, Optional: true)
          - Description: The job that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The job's ID.
                - Pt-type: Id
              - **project** (Type: map)
                - Description: Collection of identifying data for the project in which the job was created.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The project's ID.
                      - Pt-type: Id
                    - **owner** (Type: map)
                      - Description: Collection of identifying data for the project's owner.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The owner's ID.
                            - Pt-type: Id
                          - **type** (Type: str)
                            - Description: The owner type (`user` if a user or `org` if an organization).
                          - **uid** (Type: str)
                            - Description: The owner's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The project's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The job's UID.
                - Pt-type: Uid
        - **project** (Type: map, Optional: true)
          - Description: The project that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **step** (Type: map, Optional: true)
          - Description: The step that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The step's ID.
                - Pt-type: Id
              - **job** (Type: map)
                - Description: The job to which the step belongs.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The job's ID.
                      - Pt-type: Id
                    - **project** (Type: map)
                      - Description: Collection of identifying data for the project in which the job was created.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The project's ID.
                            - Pt-type: Id
                          - **owner** (Type: map)
                            - Description: Collection of identifying data for the project's owner.
                            - Components:
                              - Kind: map
                              - Keys:
                                - **id** (Type: str)
                                  - Description: The owner's ID.
                                  - Pt-type: Id
                                - **type** (Type: str)
                                  - Description: The owner type (`user` if a user or `org` if an organization).
                                - **uid** (Type: str)
                                  - Description: The owner's UID.
                                  - Pt-type: Uid
                          - **uid** (Type: str)
                            - Description: The project's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The job's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The step's UID.
                - Pt-type: Uid
        - **user** (Type: map, Optional: true)
          - Description: The user that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The user's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The user's UID.
                - Pt-type: Uid
  - **created-ts** (Type: str)
    - Description: Timestamp for the container's creation.
  - **exit-code** (Type: int, Optional: true, Maybe: true)
    - Description: The exit code for an exited container.
  - **exited-ts** (Type: str, Optional: true, Maybe: true)
    - Description: Timestamp when the container exited.
  - **id** (Type: str)
    - Description: The container's ID.
    - Pt-type: Id
  - **job** (Type: map)
    - Description: The job to which the container belongs.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The job's ID.
          - Pt-type: Id
        - **project** (Type: map)
          - Description: Collection of identifying data for the project in which the job was created.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The job's UID.
          - Pt-type: Uid
  - **location** (Type: map)
    - Description: Location where the container is running.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The location's ID.
          - Pt-type: Id
        - **org** (Type: map, Optional: true, Maybe: true)
          - Description: The organization to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The organization's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The organization's UID.
                - Pt-type: Uid
        - **project** (Type: map, Optional: true, Maybe: true)
          - Description: The project to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The location's UID.
          - Pt-type: Uid
        - **user** (Type: map, Optional: true, Maybe: true)
          - Description: The user to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The user's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The user's UID.
                - Pt-type: Uid
  - **spec** (Type: map)
    - Description: Original container specification.
    - Pt-type: ContainerSpec
  - **started-ts** (Type: str, Optional: true, Maybe: true)
    - Description: Timestamp when the container started.
  - **status** (Type: str)
    - Description: The container's current status.
    - Components:
      - Kind: enum
      - Values:
        - Type: str, Value: "restart-requested"
        - Type: str, Value: "stopping"
        - Type: str, Value: "running"
        - Type: str, Value: "restarting"
        - Type: str, Value: "failed"
        - Type: str, Value: "pulling"
        - Type: str, Value: "spawning"
        - Type: str, Value: "exited"
  - **uid** (Type: str)
    - Description: The container's UID.
    - Pt-type: Uid

## CronExpr

**Type:** str

**Summary:** Cron schedule expression

**Details:** Cron schedule expression in accordance with the [cron](https://en.wikipedia.org/wiki/Cron) command-line utility.

**Examples:**
- `15 3 * * *` (at 03:15 every day)
- `0 0,12 */2 * *` (at 00:00 and 12:00 every odd day of the month)

## DatasetRef

**Type:** str

**Summary:** Reference to a dataset

**Details:** Used to identify a dataset in a human-readable way, as an alternative to [pt-ref:Uid]()s.

For datasets **within the active job**, the dataset's [pt-ref:Id]() is used.

For **any dataset**, the format `$project-ref>$job-id#:$dataset-id` is used, with the project's [pt-ref:ProjectRef]().

**Examples:**
- `my-dataset`
- `my-org/my-project>dataset:my-dataset`
- `my-org/my-project>my-job>dataset:my-dataset`

## Duration

**Type:** str

**Summary:** Duration of time

**Details:** Durations specify a duration of time in a succinct and machine-readable way. They are typically used when specifying e.g. timeouts and delays.

Durations are specified on the format `$n$u`, where `$n` is an integer and `$u` is one of:
- `ms`: Millisecond.
- `s`: Second.
- `m`: Minute.
- `h`: Hour.
- `d`: Day.
- `w`: Week.
- `mo`: Month.
- `y`: Year.

**Examples:**
- `10ms`
- `30s`
- `5m`
- `1w`

## EnvVarSpec

**Type:** map

**Summary:** Environment variable specification

**Details:** Specifies an environment variable to be used when spawning a container.

**Components:**
- Kind: map
- Keys:
  - **name** (Type: str)
    - Description: Environment variable name.
  - **value** (Type: str, Maybe: true)
    - Description: Environment variable value.
    - Components:
      - Kind: either
      - Type: str
      - Cases:
        - Type: str (ID: arg0)
        - Type: str (ID: arg1)
        - Type: bool (ID: arg2)
        - Type: int (ID: arg3)

## Event

**Type:** map

**Summary:** Data for an event

**Details:** Polytope events are created upon various events in the service, such as a step starting or code getting pushed to a project.

**Components:**
- Kind: map
- Keys:
  - **data** (Type: map)
    - Description: Data describing the event.
    - Details: Varies depending on the type of event. Typically contains attributes with data on the user or job that caused the event, summaries of potential changes, and the new summary state of changed entities
    - Components:
      - Kind: map
      - Keys:
        - **Key Type:** any (Key Doc: Any event-specific attribute.)
          - Description: Any event-specific data.
  - **id** (Type: str)
    - Description: Unique event identifier assigned by Polytope.
  - **ts** (Type: str)
    - Description: Timestamp for when the event occurred.
  - **type** (Type: str)
    - Description: Event type identifier.
    - Details: A large set of event types exists, reflecting when entities have been e.g. created, modified or deleted. An important subset of allowed events is [pt-ref:TriggerEventType](), events that can be used to create triggers.
  - **uids** (Type: array)
    - Description: A list of UIDs associated or involved with the job.
    - Details: Varies depending on the type of event. Generally includes the UID for user or job that caused the event, the entity the event pertains to, and any other entities 'up the stack' (e.g. a job's project).
    - Components:
      - Kind: list
      - Items:
        - Type: str
        - Pt-type: Uid
  - **v** (Type: int)
    - Description: Event version. Updated when the `data` key contents change for an event type.

## FileInfo

**Type:** map

**Summary:** Container file information

**Details:** Information as returned when listing files on a container filesystem.

**Components:**
- Kind: map
- Keys:
  - **accessed-ts** (Type: int)
    - Description: Timestamp for when the file was last accessed.
  - **changed-ts** (Type: int)
    - Description: Timestamp for when the file metadata was last changed.
  - **group** (Type: str)
    - Description: Group ownership of the file.
  - **mode** (Type: str)
    - Description: File mode indicating permissions.
  - **modified-ts** (Type: int)
    - Description: Timestamp for when the file content was last modified.
  - **name** (Type: str)
    - Description: Name of the file or directory.
  - **size-b** (Type: int)
    - Description: Size of the file in bytes.
  - **target** (Type: str, Maybe: true)
    - Description: Target path if the file is a symlink.
  - **type** (Type: str)
    - Description: Type of the file.
    - Components:
      - Kind: enum
      - Values:
        - Type: str, Value: "fifo", Doc: A named pipe.
        - Type: str, Value: "dir", Doc: A directory.
        - Type: str, Value: "socket", Doc: A socket for communication.
        - Type: str, Value: "unknown", Doc: An unrecognized type.
        - Type: str, Value: "file", Doc: A regular file.
        - Type: str, Value: "symlink", Doc: A symbolic link.
  - **user** (Type: str)
    - Description: User ownership of the file.

## GitCommitInfo

**Type:** map

**Summary:** Information about a Git commit

**Details:** Contains the metadata for a Git commit.

**Components:**
- Kind: map
- Keys:
  - **author** (Type: map)
    - Description: The commit's author, as recorded by Git.
    - Components:
      - Kind: map
      - Keys:
        - **date** (Type: str)
          - Description: The time the commit was made.
          - Pt-type: Timestamp
        - **email** (Type: str)
          - Description: The email of the committer, as recorded by Git.
        - **name** (Type: str)
          - Description: The name of the committer, as recorded by Git.
  - **committer** (Type: map)
    - Description: The commit's committer, as recorded by Git.
    - Components:
      - Kind: map
      - Keys:
        - **date** (Type: str)
          - Description: The time the commit was made.
          - Pt-type: Timestamp
        - **email** (Type: str)
          - Description: The email of the committer, as recorded by Git.
        - **name** (Type: str)
          - Description: The name of the committer, as recorded by Git.
  - **id** (Type: str)
    - Description: The commit's ID, i.e. its full 40-character hash.
  - **message** (Type: str)
    - Description: The commit message.
  - **parents** (Type: array)
    - Description: The commit's parent IDs.
    - Components:
      - Kind: list
      - Items:
        - Type: str
  - **patches** (Type: array, Optional: true)
    - Description: Patches associated with the commit, i.e. the changes the commit made.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Components:
          - Kind: map
          - Keys:
            - **+** (Type: int)
              - Description: The number of added lines.
            - **-** (Type: int)
              - Description: The number of removed lines.
            - **patch** (Type: str)
              - Description: The changes.
            - **path** (Type: str)
              - Description: Path to the changed file in the repository.

## HttpResponse

**Type:** map

**Summary:** HTTP response data

**Details:** Includes the full HTTP response data in a structured format.

**Components:**
- Kind: map
- Keys:
  - **body** (Type: any, Optional: true)
    - Description: Response body.
  - **connection-time** (Type: int, Optional: true)
    - Description: How long time the connection took, in milliseconds.
  - **error** (Type: any, Optional: true)
    - Description: Error information, if the request failed.
  - **headers** (Type: map, Optional: true)
    - Description: Returned headers.
    - Details: Returned as a map of header names and values.
    - Components:
      - Kind: map
      - Keys:
        - **Key Type:** str (Key Doc: Header name.)
          - Description: Header value.
  - **request-time** (Type: int, Optional: true)
    - Description: How long time the request took, in milliseconds.
  - **status** (Type: int, Optional: true)
    - Description: The HTTP response status.

## Id

**Type:** str

**Summary:** Identifier to an entity or part of an entity

**Details:** Basic identifier. Each entity in Polytope (user, project, job, and so on) has an associated ID, first specified by the user upon creation. IDs uniquely identify users and organizations, and e.g. jobs *within* a project. They used as such to compose full references, e.g. [pt-ref:ProjectRef]() and [pt-ref:JobRef]().

IDs can in most cases be modified by an authorized user.

Valid characters are `a-z` (lower-case), `0-9`, `_` and `-`.

**Examples:**
- `my-user`
- `any-lower-case-string_123`

## ImageBuildResult

**Type:** map

**Summary:** Result from an image build

**Details:** Summary data on a result from an image build initiated in the runner API.

**Components:**
- Kind: map
- Keys:
  - **digest** (Type: str)
    - Description: Unique identifier for the built image, as a SHA256 hash.
  - **metadata** (Type: map)
    - Description: Collection of additional metadata about the build, such as build time and tags.
    - Components:
      - Kind: map
      - Keys:
        - **Key Type:** any (Key Doc: Metadata type.)
          - Description: Metadata value.

## InputRequestResult

**Type:** map

**Summary:** Result from an input request

**Details:** Summary data on a result from an input request initiated in the runner API.

**Components:**
- Kind: map
- Keys:
  - **by-user** (Type: map)
    - Description: The user that answered the input request.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The user's ID.
          - Pt-type: Id
        - **uid** (Type: str)
          - Description: The user's UID.
          - Pt-type: Uid
  - **data** (Type: any)
    - Description: The provided input.

## JobRef

**Type:** str

**Summary:** Reference to a job

**Details:** Used to uniquely identify jobs in a human-readable way, as an alternative to [pt-ref:Uid]()s.

References are specified on the format `$owner-id/$project-id>$job-id`, using the [pt-ref:Id]() for the owner (user or organization), project, and job

**Examples:**
- `my-org/my-project>my-job`

## JobSpec

**Type:** map

**Summary:** Job specification

**Details:** Specifies a job to be run by the job runner.

**Components:**
- Kind: map
- Keys:
  - **env** (Type: str, Optional: true, Maybe: true)
    - Description: The environment within the specified project in which to run the job.
  - **id** (Type: str, Optional: true, Maybe: true)
    - Description: Identifier for the job.
    - Pt-type: Id
  - **info** (Type: str, Optional: true, Maybe: true)
    - Description: Info string describing the job.
  - **location** (Type: str, Optional: true, Maybe: true)
    - Description: The location at which to run the job.
    - Pt-type: LocationRef
  - **modules** (Type: array, Optional: true, Maybe: true)
    - Description: Specification of custom (job-local) modules.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Pt-type: ModuleSpec
  - **polytope-file** (Type: map, Optional: true, Maybe: true)
    - Description: The Polytope file to use when resolving the job's modules and templates. Defaults to the default Polytope file in the project's default repo.
    - Components:
      - Kind: map
      - Keys:
        - **path** (Type: str)
          - Description: On which path in the repo to look for the Polytope file.
        - **repo** (Type: str)
          - Description: In which repo to look for the Polytope file.
          - Pt-type: RepoRef
  - **project** (Type: str, Optional: true, Maybe: true)
    - Description: Reference to the project in which to run the job.
    - Components:
      - Kind: either
      - Type: str
      - Cases:
        - Type: str (ID: arg0)
          - Pt-type: ProjectRef
        - Type: str (ID: arg1)
          - Pt-type: Uid
  - **repo-pins** (Type: map, Optional: true, Maybe: true)
    - Description: Repository pins. Used to control which revisions are used when looking up modules, templates and code.
    - Pt-type: RepoPins
  - **run** (Type: array)
    - Description: Specification of the steps to run in the job.
    - Components:
      - Kind: either
      - Type: array
      - Cases:
        - Type: array (ID: arg0)
          - Components:
            - Kind: list
            - Items:
              - Type: map
              - Components:
                - Kind: either
                - Type: map
                - Cases:
                  - Type: map (ID: arg0)
                    - Components:
                      - Kind: map
                      - Keys:
                        - **args** (Type: map, Optional: true, Maybe: true)
                          - Description: Argument values for parameters exposed by the selected module.
                          - Components:
                            - Kind: map
                            - Keys:
                              - **Key Type:** any (Key Doc: Name of a module parameter, as defined in the module., Key Pt-type: Id)
                                - Description: Argument value for the module parameter.
                        - **id** (Type: str, Optional: true)
                          - Description: The step's ID. Used to select among multiple modules in a single project.
                          - Pt-type: Id
                        - **module** (Type: str)
                          - Description: The selected module to run.
                          - Pt-type: ModuleRef
                        - **run-when** (Type: map, Optional: true, Maybe: true)
                          - Description: Specification of when to run the step.
                          - Details: If unspecified, the step will be run when the job is started.
                          - Components:
                            - Kind: map
                            - Keys:
                              - **after** (Type: str, Maybe: true)
                                - Description: ID of one or more steps that should finish successfully before the step is run.
                              - **after-condition** (Type: str, Optional: true, Maybe: true)
                                - Description: Custom checks for whether to run the step.
                                - Components:
                                  - Kind: enum
                                  - Values:
                                    - Type: str, Value: "success"
                                    - Type: str, Value: "always"
                                    - Type: str, Value: "failed"
                  - Type: str (ID: arg1)
                    - Pt-type: ModuleRef
        - Type: str (ID: arg1)
          - Pt-type: TemplateRef
  - **tags** (Type: array, Optional: true, Maybe: true)
    - Description: Tags for the job.
    - Components:
      - Kind: list
      - Items:
        - Type: str
        - Pt-type: Id
  - **visibility** (Type: str, Optional: true, Maybe: true)
    - Description: The job's visibility.
    - Components:
      - Kind: enum
      - Values:
        - Type: str, Value: "project"
        - Type: str, Value: "private"
        - Type: str, Value: "public"
  - **volumes** (Type: array, Optional: true, Maybe: true)
    - Description: Specifications for job-scoped volumes to create. Volumes are automatically created to populate any volume mounts requested by steps – this is only for volumes that you want to share between multiple containers.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Components:
          - Kind: map
          - Keys:
            - **id** (Type: str)
              - Description: Identifier for the volume.
              - Pt-type: Id
            - **info** (Type: str, Optional: true, Maybe: true)
              - Description: Info string describing the volume.

## JobSummary

**Type:** map

**Summary:** Job summary

**Details:** Summary as returned when querying for jobs.

**Components:**
- Kind: map
- Keys:
  - **created-by** (Type: map)
    - Description: Information about what or who created the job.
    - Components:
      - Kind: map
      - Keys:
        - **job** (Type: map, Optional: true)
          - Description: The job that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The job's ID.
                - Pt-type: Id
              - **project** (Type: map)
                - Description: Collection of identifying data for the project in which the job was created.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The project's ID.
                      - Pt-type: Id
                    - **owner** (Type: map)
                      - Description: Collection of identifying data for the project's owner.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The owner's ID.
                            - Pt-type: Id
                          - **type** (Type: str)
                            - Description: The owner type (`user` if a user or `org` if an organization).
                          - **uid** (Type: str)
                            - Description: The owner's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The project's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The job's UID.
                - Pt-type: Uid
        - **project** (Type: map, Optional: true)
          - Description: The project that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **step** (Type: map, Optional: true)
          - Description: The step that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The step's ID.
                - Pt-type: Id
              - **job** (Type: map)
                - Description: The job to which the step belongs.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The job's ID.
                      - Pt-type: Id
                    - **project** (Type: map)
                      - Description: Collection of identifying data for the project in which the job was created.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The project's ID.
                            - Pt-type: Id
                          - **owner** (Type: map)
                            - Description: Collection of identifying data for the project's owner.
                            - Components:
                              - Kind: map
                              - Keys:
                                - **id** (Type: str)
                                  - Description: The owner's ID.
                                  - Pt-type: Id
                                - **type** (Type: str)
                                  - Description: The owner type (`user` if a user or `org` if an organization).
                                - **uid** (Type: str)
                                  - Description: The owner's UID.
                                  - Pt-type: Uid
                          - **uid** (Type: str)
                            - Description: The project's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The job's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The step's UID.
                - Pt-type: Uid
        - **user** (Type: map, Optional: true)
          - Description: The user that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The user's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The user's UID.
                - Pt-type: Uid
  - **created-ts** (Type: str)
    - Description: Timestamp for the job's creation.
  - **finished-ts** (Type: str, Maybe: true)
    - Description: Timestamp for the job's finish time.
  - **id** (Type: str)
    - Description: The job's ID.
    - Pt-type: Id
  - **info** (Type: str, Maybe: true)
    - Description: Optional user-provided info string describing the job.
  - **location** (Type: map)
    - Description: The location at which to the job is running.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The location's ID.
          - Pt-type: Id
        - **org** (Type: map, Optional: true, Maybe: true)
          - Description: The organization to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The organization's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The organization's UID.
                - Pt-type: Uid
        - **project** (Type: map, Optional: true, Maybe: true)
          - Description: The project to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The location's UID.
          - Pt-type: Uid
        - **user** (Type: map, Optional: true, Maybe: true)
          - Description: The user to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The user's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The user's UID.
                - Pt-type: Uid
  - **modified-ts** (Type: str)
    - Description: Timestamp for when the job was last modified.
  - **project** (Type: map)
    - Description: Collection of identifying data for the project in which the job was created.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The project's ID.
          - Pt-type: Id
        - **owner** (Type: map)
          - Description: Collection of identifying data for the project's owner.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The owner's ID.
                - Pt-type: Id
              - **type** (Type: str)
                - Description: The owner type (`user` if a user or `org` if an organization).
              - **uid** (Type: str)
                - Description: The owner's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The project's UID.
          - Pt-type: Uid
  - **spec** (Type: map)
    - Description: Job specification in full format.
    - Pt-type: JobSpec
  - **started-ts** (Type: str, Maybe: true)
    - Description: Timestamp for the step's start time.
  - **status** (Type: str)
    - Description: The job's current status.
    - Components:
      - Kind: enum
      - Values:
        - Type: str, Value: "success"
        - Type: str, Value: "stopping"
        - Type: str, Value: "running"
        - Type: str, Value: "starting"
        - Type: str, Value: "deleting"
        - Type: str, Value: "failed"
        - Type: str, Value: "queued"
        - Type: str, Value: "stopped"
        - Type: str, Value: "canceled"
  - **submitted-spec** (Type: map)
    - Description: The job specification as submitted when the job was created.
    - Pt-type: JobSpec
  - **uid** (Type: str)
    - Description: The job's UID.
    - Pt-type: Uid
  - **visibility** (Type: str)
    - Description: The job's visibility.
    - Components:
      - Kind: enum
      - Values:
        - Type: str, Value: "project"
        - Type: str, Value: "private"
        - Type: str, Value: "public"

## LocationRef

**Type:** str

**Summary:** Reference to a location

**Details:** Used to uniquely identify locations in a human-readable way, as an alternative to [pt-ref:Uid]()s.

References are specified on the format `$owner-type:$owner-id>location:my-location`, using the [pt-ref:Id]()for the owner (user or organization).

**Examples:**
- `eu-north`
- `user:my-user>location:my-agent`
- `org:my-org>location:my-agent`

## ModuleDetails

**Type:** map

**Summary:** Module details

**Details:** Full metadata summary and specification of a module

**Components:**
- Kind: map
- Keys:
  - **api-version** (Type: str, Optional: true)
    - Description: The version of the runner API for which the code should be run.
  - **args** (Type: map, Optional: true, Maybe: true)
    - Description: Arguments values for parameters exposed by the selected module.
    - Components:
      - Kind: map
      - Keys:
        - **Key Type:** any (Key Doc: Name of a module parameter, as defined in the module., Key Pt-type: Id)
          - Description: Argument value for the module parameter.
  - **code** (Type: str, Optional: true)
    - Description: The code to run against the runner API.
    - Pt-type: Code
  - **commit** (Type: map)
    - Description: Information about the Git commit from which the module was extracted.
    - Pt-type: GitCommitInfo
  - **default?** (Type: bool)
    - Description: Whether the module is the default for the Polytope file/repo/project.
    - Details: Default modules can be called using only the [pt-ref:RepoRef](), or the [pt-ref:ProjectRef]() if it's in the default repository.
  - **id** (Type: str)
    - Description: The module's ID.
    - Pt-type: Id
  - **info** (Type: str, Maybe: true)
    - Description: Description for the module.
  - **module** (Type: str, Optional: true)
    - Description: The selected module to run.
    - Pt-type: ModuleRef
  - **params** (Type: array, Optional: true, Maybe: true)
    - Description: Specification for the module's input parameters.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Components:
          - Kind: map
          - Keys:
            - **id** (Type: str)
              - Description: Parameter identifier.
              - Pt-type: Id
            - **info** (Type: str, Optional: true, Maybe: true)
              - Description: Description of the parameter.
            - **name** (Type: str, Optional: true, Maybe: true)
              - Description: Full name of the parameter.
            - **type** (Type: any)
              - Description: Parameter data type format.
  - **repo** (Type: map)
    - Description: Collection of identifying data for the repository containing the module.
    - Components:
      - Kind: map
      - Keys:
        - **default?** (Type: bool)
          - Description: Whether the repo is the default in its parent project.
        - **id** (Type: str)
          - Description: The project's ID.
          - Pt-type: Id
        - **project** (Type: map)
          - Description: The project to which the repo belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The project's UID.
          - Pt-type: Uid

## ModuleRef

**Type:** str

**Summary:** Reference to a module

**Details:** Used to identify modules.

References are specified on the format `$owner-id/$project-id@$optional-revision:$optional-repo-path!$optional-module-id`, using the [pt-ref:Id]() for the owner (user or organization) and project (with an optional revision reference), optionally the path to where the module is located in the repository, and optionally the [pt-ref:Id]() for the module (if one has been set or there are multiple modules or templates in the project).Same syntax as [pt-ref:TemplateRef]()s.

**Examples:**
- `my-org/my-project@21f9ea12:my/repo/path!my-module`
- `my-org/my-project@my-branch!my-module`
- `my-user/my-project!my-module`
- `my-user/my-project`

## ModuleSpec

**Type:** map

**Summary:** Specification for a module

**Details:** Specifies a module that can be run in a step. A module specification must contain exactly one of the following keys:

- `code`: Runs a code snippet.
- `module`: Extends another module.

**Components:**
- Kind: map
- Keys:
  - **api-version** (Type: str, Optional: true)
    - Description: The version of the runner API for which the code should be run.
  - **args** (Type: map, Optional: true, Maybe: true)
    - Description: Arguments values for parameters exposed by the selected module.
    - Components:
      - Kind: map
      - Keys:
        - **Key Type:** any (Key Doc: Name of a module parameter, as defined in the module., Key Pt-type: Id)
          - Description: Argument value for the module parameter.
  - **code** (Type: str, Optional: true)
    - Description: The code to run against the runner API.
    - Pt-type: Code
  - **default?** (Type: bool, Optional: true)
    - Description: Whether the module should be treated as the default for the Polytope file/repo/project.
    - Details: Default modules can be called using only the [pt-ref:RepoRef](), or the [pt-ref:ProjectRef]() if it's in the default repository.
  - **id** (Type: str)
    - Description: The module's ID. Used to select among multiple modules in a single project.
    - Pt-type: Id
  - **info** (Type: str, Optional: true, Maybe: true)
    - Description: The module's description.
  - **module** (Type: str, Optional: true)
    - Description: The selected module to run.
    - Pt-type: ModuleRef
  - **params** (Type: array, Optional: true, Maybe: true)
    - Description: Specification for the module's input parameters.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Components:
          - Kind: map
          - Keys:
            - **id** (Type: str)
              - Description: Parameter identifier.
              - Pt-type: Id
            - **info** (Type: str, Optional: true, Maybe: true)
              - Description: Description of the parameter.
            - **name** (Type: str, Optional: true, Maybe: true)
              - Description: Full name of the parameter.
            - **type** (Type: any)
              - Description: Parameter data type format.

## ModuleSummary

**Type:** map

**Summary:** Module metadata summary

**Details:** Contains descriptive information but not the full module specification.

**Components:**
- Kind: map
- Keys:
  - **default?** (Type: bool)
    - Description: Whether the module is the default for the Polytope file/repo/project.
    - Details: Default modules can be called using only the [pt-ref:RepoRef](), or the [pt-ref:ProjectRef]() if it's in the default repository.
  - **id** (Type: str)
    - Description: The module's ID.
    - Pt-type: Id
  - **info** (Type: str, Maybe: true)
    - Description: Description for the module.
  - **repo** (Type: map)
    - Description: Collection of identifying data for the repository containing the module.
    - Components:
      - Kind: map
      - Keys:
        - **default?** (Type: bool)
          - Description: Whether the repo is the default in its parent project.
        - **id** (Type: str)
          - Description: The project's ID.
          - Pt-type: Id
        - **project** (Type: map)
          - Description: The project to which the repo belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The project's UID.
          - Pt-type: Uid

## MountSourceSpec

**Type:** map

**Summary:** Specification for a container mount source

**Details:** Specifies a mount source to be mounted to a path in container.

**Components:**
- Kind: either
- Type: map
- Cases:
  - **dataset** (ID: dataset, Title: Dataset)
    - Components:
      - Kind: map
      - Keys:
        - **dataset** (Type: str)
          - Description: The dataset to mount.
          - Components:
            - Kind: either
            - Type: str
            - Cases:
              - Type: str (ID: arg0)
                - Pt-type: DatasetRef
              - Type: str (ID: arg1)
                - Pt-type: Uid
        - **path** (Type: str, Optional: true, Maybe: true)
          - Description: Path in the dataset.
        - **type** (Type: str)
          - Description: Always equals `dataset`.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "dataset"
        - **version** (Type: int, Optional: true, Maybe: true)
          - Description: Version of the dataset.
  - **host** (ID: host, Title: Host)
    - Description: When used locally with Docker as runtime, mounts the provided path as a bind mount. When used non-locally, resolves to repository mount using the job's default repository if available.
    - Components:
      - Kind: map
      - Keys:
        - **path** (Type: str)
          - Description: Path on the host system to mount.
        - **type** (Type: str)
          - Description: Always equals `host`.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "host"
  - **repo** (ID: repo, Title: Repository)
    - Components:
      - Kind: map
      - Keys:
        - **path** (Type: str, Optional: true, Maybe: true)
          - Description: Path in the repository.
        - **repo** (Type: str, Optional: true, Maybe: true)
          - Description: The repository to mount.
          - Components:
            - Kind: either
            - Type: str
            - Cases:
              - Type: str (ID: arg0)
                - Pt-type: RepoRef
              - Type: str (ID: arg1)
                - Pt-type: Uid
        - **revision** (Type: str, Optional: true, Maybe: true)
          - Description: Revision of the repository.
        - **type** (Type: str)
          - Description: Always equals `repo`.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "repo"
  - **string** (ID: string, Title: String)
    - Description: Mounts the provided string into a file at the given path.
    - Components:
      - Kind: map
      - Keys:
        - **data** (Type: str)
          - Description: String data to mount into a file.
        - **type** (Type: str)
          - Description: Always equals `string`.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "string"
  - **volume** (ID: volume, Title: Volume)
    - Components:
      - Kind: map
      - Keys:
        - **create** (Type: str, Optional: true, Maybe: true)
          - Description: When to create a new volume.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "never", Doc: Never create a new volume. Fails if the specified volume doesn't exist.
              - Type: str, Value: "when-missing", Doc: Create a new volume if the specified volume doesn't exist (default).
              - Type: str, Value: "always", Doc: Always create a new volume. Appends an integer to the ID if it already exists.
        - **id** (Type: str, Optional: true)
          - Description: The volume to mount.
          - Pt-type: Id
        - **scope** (Type: str, Optional: true, Maybe: true)
          - Description: Volume scope.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "project", Doc: Project volume.
              - Type: str, Value: "job", Doc: Job volume.
        - **source** (Type: map, Optional: true, Maybe: true)
          - Description: Specifies another mount source to use as the volume's initial state.
          - Pt-type: MountSourceSpec
        - **type** (Type: str)
          - Description: Always equals `volume`.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "volume"

## PaginationStatsSpec

**Type:** str

**Summary:** Pagination statistics specification

**Details:** Used when listing any items via the REST API.

Consists of a comma separated string of the following keywords:

- `has-after`: Whether more items were available after the last received.
- `has-before`: Whether more items were available before the first received.
- `count-after`: The number of items available before the last received.
- `count-before`: The number of items available before the first received.
- `total`: The total number of items available for the list query.

**Examples:**
- `has-after`
- `has-before,count-after,total`

## PolytopeFile

**Type:** map

**Summary:** Polytope file

**Details:** Polytope files define modules and templates that are used in jobs, as well as triggers that can be used to trigger job execution.

Polytope files are defined on the YAML, JSON, or EDN format and are named `polytope.yml`, `polytope.yaml`, `polytope.json`, or `polytope.edn` accordingly.

To use a Polytope file's modules and templates locally using the CLI, stand in the file's folder and use their [pt-ref:Id](). To use them in the cloud, push the file to a repository and use their [pt-ref:ModuleRef]()s and [pt-ref:TemplateRef]()s. 

To use triggers, push the file to a repository and mark the corresponding branch as active in the Triggers interface. Triggers can alternatively be specified in this interface, as a GitOps-free alternative.

**Components:**
- Kind: map
- Keys:
  - **modules** (Type: array, Optional: true)
    - Description: Module specifications.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Pt-type: ModuleSpec
  - **templates** (Type: array, Optional: true)
    - Description: Template specifications.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Pt-type: TemplateSpec
  - **triggers** (Type: array, Optional: true)
    - Description: Trigger specifications.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Pt-type: TriggerSpec

## ProjectRef

**Type:** str

**Summary:** Reference to a project

**Details:** Used to uniquely identify projects in a human-readable way, as an alternative to [pt-ref:Uid]()s.

References are specified on the format `$owner-id/$project-id`, using the [pt-ref:Id]()for the owner (user or organization) and project.

**Examples:**
- `my-org/my-project`

## RepoPins

**Type:** map

**Summary:** Repository pins for job reproduction

**Details:** Mainly used to ensure jobs can be exactly reproduced. Contains what Git commits any revisions (branches or tags) were resolved to during job runtime, for any relevant repository.

Optionally includes a revision pin for a repository's main branch.

**Components:**
- Kind: map
- Keys:
  - **Key Type:** map (Key Doc: Repository for which pins are defined., Key Comps: Kind: either, Type: str, Cases: Type: str (ID: arg0, Pt-type: RepoRef), Type: str (ID: arg1, Pt-type: Uid))
    - Components:
      - Kind: map
      - Keys:
        - **default** (Type: str, Optional: true)
          - Description: Pinned default branch.
        - **revisions** (Type: map, Optional: true)
          - Description: Revision pins.
          - Components:
            - Kind: map
            - Keys:
              - **Key Type:** str (Key Doc: Revision to pin.)
                - Description: Pinned commit ID.

## RepoRef

**Type:** str

**Summary:** Reference to a repository

**Details:** Used to uniquely identify repository in a human-readable way, as an alternative to [pt-ref:Uid]()s.

References are specified on the format `$owner-id/$project-id/$repo-id`, using the [pt-ref:Id]()for the owner (user or organization), project, and repository. Repositories designated as default for a project can also be specified by its [pt-ref:ProjectRef]().

**Examples:**
- `my-org/my-project/my-repo`
- `my-org/my-project`

## ServicePortsSpec

**Type:** map

**Summary:** Specification for service ports

**Details:** Specifies ports that are opened in a job. Ports are specified either as a single port or as a range.

**Components:**
- Kind: either
- Type: map
- Cases:
  - **true** (ID: true, Title: Single port)
    - Components:
      - Kind: map
      - Keys:
        - **expose-as** (Type: int, Optional: true, Maybe: true)
          - Description: Port number to expose (default: same as container).
        - **internal** (Type: bool, Optional: true, Maybe: true)
          - Description: Whether to only use the service internally (i.e. not expose a link to the user).
        - **label** (Type: str, Optional: true, Maybe: true)
          - Description: Label for the service.
          - Pt-type: Id
        - **port** (Type: int)
          - Description: Port number in the container.
        - **protocol** (Type: str)
          - Description: Protocol on which to expose the port.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "tcp"
              - Type: str, Value: "udp"
              - Type: str, Value: "http"
              - Type: str, Value: "https"
  - **false** (ID: false, Title: Port range)
    - Components:
      - Kind: map
      - Keys:
        - **expose-as** (Type: str, Optional: true, Maybe: true)
          - Description: Port ranges and individual ports to expose, separated by commas, matching the ports in `range` (default: same as `range`).
        - **internal** (Type: bool, Optional: true, Maybe: true)
          - Description: Whether to only use the service internally (i.e. not expose a link to the user).
        - **label** (Type: str, Optional: true, Maybe: true)
          - Description: Label for the service.
          - Pt-type: Id
        - **protocol** (Type: str)
          - Description: Protocol on which to expose the port range.
          - Components:
            - Kind: enum
            - Values:
              - Type: str, Value: "tcp"
              - Type: str, Value: "udp"
              - Type: str, Value: "http"
              - Type: str, Value: "https"
        - **range** (Type: str)
          - Description: Port ranges and individual ports in the container, separated by commas (e.g., `80,443,8000-8100`).

## ServiceRef

**Type:** str

**Summary:** Reference to a service

**Details:** Used to identify a service in a human-readable way, as an alternative to [pt-ref:Uid]()s.

For services **within the active job**, the service's [pt-ref:Id]() is used.

For **any service**, the format `$project-ref>$job-id#:$service-id` is used, with the project's [pt-ref:ProjectRef]().

**Examples:**
- `my-service`
- `my-org/my-project>my-job#my-step:my-service`

## ServiceSpec

**Type:** map

**Summary:** Specification for a service

**Details:** Specifies a service that can be opened in a job.

**Components:**
- Kind: map
- Keys:
  - **id** (Type: str)
    - Description: Identifier for the service. Used to uniquely identify the service within its job.
    - Pt-type: Id
  - **ports** (Type: array)
    - Description: Ports opened up for the service.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Pt-type: ServicePortsSpec

## ServiceSummary

**Type:** map

**Summary:** Service metadata summary

**Details:** Summary as returned when querying for services, or as part of e.g. a [pt-ref:JobSummary]().

**Components:**
- Kind: map
- Keys:
  - **created-by** (Type: map)
    - Description: Who or what created the step.
    - Components:
      - Kind: map
      - Keys:
        - **job** (Type: map, Optional: true)
          - Description: The job that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The job's ID.
                - Pt-type: Id
              - **project** (Type: map)
                - Description: Collection of identifying data for the project in which the job was created.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The project's ID.
                      - Pt-type: Id
                    - **owner** (Type: map)
                      - Description: Collection of identifying data for the project's owner.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The owner's ID.
                            - Pt-type: Id
                          - **type** (Type: str)
                            - Description: The owner type (`user` if a user or `org` if an organization).
                          - **uid** (Type: str)
                            - Description: The owner's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The project's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The job's UID.
                - Pt-type: Uid
        - **project** (Type: map, Optional: true)
          - Description: The project that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **step** (Type: map, Optional: true)
          - Description: The step that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The step's ID.
                - Pt-type: Id
              - **job** (Type: map)
                - Description: The job to which the step belongs.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The job's ID.
                      - Pt-type: Id
                    - **project** (Type: map)
                      - Description: Collection of identifying data for the project in which the job was created.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The project's ID.
                            - Pt-type: Id
                          - **owner** (Type: map)
                            - Description: Collection of identifying data for the project's owner.
                            - Components:
                              - Kind: map
                              - Keys:
                                - **id** (Type: str)
                                  - Description: The owner's ID.
                                  - Pt-type: Id
                                - **type** (Type: str)
                                  - Description: The owner type (`user` if a user or `org` if an organization).
                                - **uid** (Type: str)
                                  - Description: The owner's UID.
                                  - Pt-type: Uid
                          - **uid** (Type: str)
                            - Description: The project's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The job's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The step's UID.
                - Pt-type: Uid
        - **user** (Type: map, Optional: true)
          - Description: The user that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The user's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The user's UID.
                - Pt-type: Uid
  - **created-ts** (Type: str)
    - Description: Timestamp for the service's creation.
  - **host** (Type: str, Maybe: true)
    - Description: The host or domain at which the service can be accessed.
  - **id** (Type: str)
    - Description: The service's ID.
    - Pt-type: Id
  - **info** (Type: str, Maybe: true)
    - Description: Description of the service, as specified by a user.
  - **job** (Type: map)
    - Description: The job to which the service belongs.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The job's ID.
          - Pt-type: Id
        - **project** (Type: map)
          - Description: Collection of identifying data for the project in which the job was created.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The job's UID.
          - Pt-type: Uid
  - **location** (Type: map)
    - Description: The location at which the service is/was running.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The location's ID.
          - Pt-type: Id
        - **org** (Type: map, Optional: true, Maybe: true)
          - Description: The organization to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The organization's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The organization's UID.
                - Pt-type: Uid
        - **project** (Type: map, Optional: true, Maybe: true)
          - Description: The project to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The location's UID.
          - Pt-type: Uid
        - **user** (Type: map, Optional: true, Maybe: true)
          - Description: The user to which the location belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The user's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The user's UID.
                - Pt-type: Uid
  - **modified-ts** (Type: str)
    - Description: Timestamp at which the service was last modified.
  - **ports** (Type: array)
    - Description: Ports exposed by the service.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Components:
          - Kind: map
          - Keys:
            - **exposed-as** (Type: map, Optional: true)
              - Description: Port exposed for the service. If unset, same as the opened port.
              - Components:
                - Kind: map
                - Keys:
                  - **port** (Type: int, Maybe: true)
                    - Description: Port number on which the service is exposed.
                  - **requested** (Type: int)
                    - Description: The port number that was requested when the service was opened.
            - **label** (Type: str, Optional: true, Maybe: true)
              - Description: Label for the port.
              - Pt-type: Id
            - **port** (Type: int)
              - Description: Port number opened up for the service.
            - **protocol** (Type: str)
              - Description: Protocol for which the service is exposed.
              - Components:
                - Kind: enum
                - Values:
                  - Type: str, Value: "tcp"
                  - Type: str, Value: "udp"
                  - Type: str, Value: "http"
                  - Type: str, Value: "https"
  - **proxy-key** (Type: str, Maybe: true)
    - Description: Key used for constructing URLs for proxying to the service.
  - **started-ts** (Type: str, Maybe: true)
    - Description: Timestamp at which the service started.
  - **status** (Type: str)
    - Description: Current status of the service.
    - Components:
      - Kind: enum
      - Values:
        - Type: str, Value: "stopping"
        - Type: str, Value: "running"
        - Type: str, Value: "stopped"
        - Type: str, Value: "pending"
  - **stopped-ts** (Type: str, Maybe: true)
    - Description: Timestamp for the step's stopping time.
  - **uid** (Type: str)
    - Description: The service's UID.
    - Pt-type: Uid

## StepRef

**Type:** str

**Summary:** Reference to a step

**Details:** Used to identify a step in a human-readable way, as an alternative to [pt-ref:Uid]()s.

For steps **within the active job**, the step's [pt-ref:Id]() is used.

For steps **within the active project**, the format `$job-id#$step-id` is used, with the job's [pt-ref:Id]().

For **any step**, the format `$project-ref>$job-id#$step-id` is used, with the project's [pt-ref:ProjectRef]().

**Examples:**
- `my-step`
- `my-job#my-step`
- `my-org/my-project>my-job#my-step`

## StepSummary

**Type:** map

**Summary:** Step summary

**Details:** Summary as returned when querying for steps, or as part of e.g. a [pt-ref:JobSummary]().

**Components:**
- Kind: map
- Keys:
  - **created-by** (Type: map)
    - Description: Information about what or who created the step.
    - Components:
      - Kind: map
      - Keys:
        - **job** (Type: map, Optional: true)
          - Description: The job that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The job's ID.
                - Pt-type: Id
              - **project** (Type: map)
                - Description: Collection of identifying data for the project in which the job was created.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The project's ID.
                      - Pt-type: Id
                    - **owner** (Type: map)
                      - Description: Collection of identifying data for the project's owner.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The owner's ID.
                            - Pt-type: Id
                          - **type** (Type: str)
                            - Description: The owner type (`user` if a user or `org` if an organization).
                          - **uid** (Type: str)
                            - Description: The owner's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The project's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The job's UID.
                - Pt-type: Uid
        - **project** (Type: map, Optional: true)
          - Description: The project that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **step** (Type: map, Optional: true)
          - Description: The step that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The step's ID.
                - Pt-type: Id
              - **job** (Type: map)
                - Description: The job to which the step belongs.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The job's ID.
                      - Pt-type: Id
                    - **project** (Type: map)
                      - Description: Collection of identifying data for the project in which the job was created.
                      - Components:
                        - Kind: map
                        - Keys:
                          - **id** (Type: str)
                            - Description: The project's ID.
                            - Pt-type: Id
                          - **owner** (Type: map)
                            - Description: Collection of identifying data for the project's owner.
                            - Components:
                              - Kind: map
                              - Keys:
                                - **id** (Type: str)
                                  - Description: The owner's ID.
                                  - Pt-type: Id
                                - **type** (Type: str)
                                  - Description: The owner type (`user` if a user or `org` if an organization).
                                - **uid** (Type: str)
                                  - Description: The owner's UID.
                                  - Pt-type: Uid
                          - **uid** (Type: str)
                            - Description: The project's UID.
                            - Pt-type: Uid
                    - **uid** (Type: str)
                      - Description: The job's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The step's UID.
                - Pt-type: Uid
        - **user** (Type: map, Optional: true)
          - Description: The user that created the object.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The user's ID.
                - Pt-type: Id
              - **uid** (Type: str)
                - Description: The user's UID.
                - Pt-type: Uid
  - **created-ts** (Type: str)
    - Description: Timestamp for the step's creation.
  - **finished-ts** (Type: str, Maybe: true)
    - Description: Timestamp for the step's finish time.
  - **id** (Type: str)
    - Description: The step's ID.
    - Pt-type: Id
  - **info** (Type: str, Maybe: true)
    - Description: Description of the step, as specified by a user.
  - **job** (Type: map)
    - Description: The job to which the step belongs.
    - Components:
      - Kind: map
      - Keys:
        - **id** (Type: str)
          - Description: The job's ID.
          - Pt-type: Id
        - **project** (Type: map)
          - Description: Collection of identifying data for the project in which the job was created.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The job's UID.
          - Pt-type: Uid
  - **modified-ts** (Type: str)
    - Description: Timestamp for when the step was last modified.
  - **spec** (Type: map)
    - Description: Step specification in full format.
    - Components:
      - Kind: map
      - Keys:
        - **args** (Type: map, Optional: true, Maybe: true)
          - Description: Argument values for parameters exposed by the selected module.
          - Components:
            - Kind: map
            - Keys:
              - **Key Type:** any (Key Doc: Name of a module parameter, as defined in the module., Key Pt-type: Id)
                - Description: Argument value for the module parameter.
        - **id** (Type: str, Optional: true)
          - Description: The step's ID. Used to select among multiple modules in a single project.
          - Pt-type: Id
        - **module** (Type: str)
          - Description: The selected module to run.
          - Pt-type: ModuleRef
        - **run-when** (Type: map, Optional: true, Maybe: true)
          - Description: Specification of when to run the step.
          - Details: If unspecified, the step will be run when the job is started.
          - Components:
            - Kind: map
            - Keys:
              - **after** (Type: str, Maybe: true)
                - Description: ID of one or more steps that should finish successfully before the step is run.
              - **after-condition** (Type: str, Optional: true, Maybe: true)
                - Description: Custom checks for whether to run the step.
                - Components:
                  - Kind: enum
                  - Values:
                    - Type: str, Value: "success"
                    - Type: str, Value: "always"
                    - Type: str, Value: "failed"
  - **started-ts** (Type: str, Maybe: true)
    - Description: Timestamp for the step's start time.
  - **status** (Type: str)
    - Description: The step's current status.
    - Components:
      - Kind: enum
      - Values:
        - Type: str, Value: "success"
        - Type: str, Value: "stopping"
        - Type: str, Value: "running"
        - Type: str, Value: "starting"
        - Type: str, Value: "deleting"
        - Type: str, Value: "failed"
        - Type: str, Value: "queued"
        - Type: str, Value: "stopped"
        - Type: str, Value: "canceled"
  - **submitted-spec** (Type: map, Maybe: true)
    - Description: Step creation specification in original format.
    - Components:
      - Kind: map
      - Keys:
        - **args** (Type: map, Optional: true, Maybe: true)
          - Description: Argument values for parameters exposed by the selected module.
          - Components:
            - Kind: map
            - Keys:
              - **Key Type:** any (Key Doc: Name of a module parameter, as defined in the module., Key Pt-type: Id)
                - Description: Argument value for the module parameter.
        - **id** (Type: str, Optional: true)
          - Description: The step's ID. Used to select among multiple modules in a single project.
          - Pt-type: Id
        - **module** (Type: str)
          - Description: The selected module to run.
          - Pt-type: ModuleRef
        - **run-when** (Type: map, Optional: true, Maybe: true)
          - Description: Specification of when to run the step.
          - Details: If unspecified, the step will be run when the job is started.
          - Components:
            - Kind: map
            - Keys:
              - **after** (Type: str, Maybe: true)
                - Description: ID of one or more steps that should finish successfully before the step is run.
              - **after-condition** (Type: str, Optional: true, Maybe: true)
                - Description: Custom checks for whether to run the step.
                - Components:
                  - Kind: enum
                  - Values:
                    - Type: str, Value: "success"
                    - Type: str, Value: "always"
                    - Type: str, Value: "failed"
  - **uid** (Type: str)
    - Description: The step's UID.
    - Pt-type: Uid

## TemplateDetails

**Type:** map

**Summary:** Template details

**Details:** Full metadata summary and specification of a template

**Components:**
- Kind: map
- Keys:
  - **commit** (Type: map)
    - Description: Information about the Git commit from which the template was extracted.
    - Pt-type: GitCommitInfo
  - **id** (Type: str)
    - Description: The template's ID.
    - Pt-type: Id
  - **info** (Type: str, Maybe: true)
    - Description: Description for the template.
  - **repo** (Type: map)
    - Description: The repository in which the template is located.
    - Components:
      - Kind: map
      - Keys:
        - **default?** (Type: bool)
          - Description: Whether the repo is the default in its parent project.
        - **id** (Type: str)
          - Description: The project's ID.
          - Pt-type: Id
        - **project** (Type: map)
          - Description: The project to which the repo belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The project's UID.
          - Pt-type: Uid
  - **run** (Type: array)
    - Description: The steps that are run in the module.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Components:
          - Kind: either
          - Type: map
          - Cases:
            - Type: map (ID: arg0)
              - Components:
                - Kind: map
                - Keys:
                  - **args** (Type: map, Optional: true, Maybe: true)
                    - Description: Argument values for parameters exposed by the selected module.
                    - Components:
                      - Kind: map
                      - Keys:
                        - **Key Type:** any (Key Doc: Name of a module parameter, as defined in the module., Key Pt-type: Id)
                          - Description: Argument value for the module parameter.
                  - **id** (Type: str, Optional: true)
                    - Description: The step's ID. Used to select among multiple modules in a single project.
                    - Pt-type: Id
                  - **module** (Type: str)
                    - Description: The selected module to run.
                    - Pt-type: ModuleRef
                  - **run-when** (Type: map, Optional: true, Maybe: true)
                    - Description: Specification of when to run the step.
                    - Details: If unspecified, the step will be run when the job is started.
                    - Components:
                      - Kind: map
                      - Keys:
                        - **after** (Type: str, Maybe: true)
                          - Description: ID of one or more steps that should finish successfully before the step is run.
                        - **after-condition** (Type: str, Optional: true, Maybe: true)
                          - Description: Custom checks for whether to run the step.
                          - Components:
                            - Kind: enum
                            - Values:
                              - Type: str, Value: "success"
                              - Type: str, Value: "always"
                              - Type: str, Value: "failed"
            - Type: str (ID: arg1)
              - Pt-type: ModuleRef

## TemplateRef

**Type:** str

**Summary:** Reference to a template

**Details:** Used to identify templates.

References are specified on the format `$owner-id/$project-id@$optional-revision:$optional-repo-path!$optional-template-id`, using the [pt-ref:Id]() for the owner (user or organization) and project (with an optional revision reference), optionally the path to where the template is located in the repository, and optionally the [pt-ref:Id]() for the template (if one has been set or there are multiple templates or modules in the project).

Same syntax as [pt-ref:ModuleRef]()s.

**Examples:**
- `my-org/my-project@21f9ea12:my/repo/path!my-template`
- `my-org/my-project@my-branch!my-template`
- `my-user/my-project!my-template`
- `my-user/my-project`

## TemplateSpec

**Type:** map

**Summary:** Specification for a template

**Details:** Specifies a template that can be run as the basis for a job.

**Components:**
- Kind: map
- Keys:
  - **id** (Type: str)
    - Description: The template's ID. Used to select among multiple modules in a single project.
    - Pt-type: Id
  - **info** (Type: str, Optional: true, Maybe: true)
    - Description: Description for the template.
  - **run** (Type: array)
    - Description: The steps that are run in the module.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Components:
          - Kind: either
          - Type: map
          - Cases:
            - Type: map (ID: arg0)
              - Components:
                - Kind: map
                - Keys:
                  - **args** (Type: map, Optional: true, Maybe: true)
                    - Description: Argument values for parameters exposed by the selected module.
                    - Components:
                      - Kind: map
                      - Keys:
                        - **Key Type:** any (Key Doc: Name of a module parameter, as defined in the module., Key Pt-type: Id)
                          - Description: Argument value for the module parameter.
                  - **id** (Type: str, Optional: true)
                    - Description: The step's ID. Used to select among multiple modules in a single project.
                    - Pt-type: Id
                  - **module** (Type: str)
                    - Description: The selected module to run.
                    - Pt-type: ModuleRef
                  - **run-when** (Type: map, Optional: true, Maybe: true)
                    - Description: Specification of when to run the step.
                    - Details: If unspecified, the step will be run when the job is started.
                    - Components:
                      - Kind: map
                      - Keys:
                        - **after** (Type: str, Maybe: true)
                          - Description: ID of one or more steps that should finish successfully before the step is run.
                        - **after-condition** (Type: str, Optional: true, Maybe: true)
                          - Description: Custom checks for whether to run the step.
                          - Components:
                            - Kind: enum
                            - Values:
                              - Type: str, Value: "success"
                              - Type: str, Value: "always"
                              - Type: str, Value: "failed"
            - Type: str (ID: arg1)
              - Pt-type: ModuleRef

## TemplateSummary

**Type:** map

**Summary:** Template metadata summary

**Details:** Contains descriptive information but not the full template specification.

**Components:**
- Kind: map
- Keys:
  - **id** (Type: str)
    - Description: The template's ID.
    - Pt-type: Id
  - **info** (Type: str, Maybe: true)
    - Description: Description for the template.
  - **repo** (Type: map)
    - Description: The repository in which the template is located.
    - Components:
      - Kind: map
      - Keys:
        - **default?** (Type: bool)
          - Description: Whether the repo is the default in its parent project.
        - **id** (Type: str)
          - Description: The project's ID.
          - Pt-type: Id
        - **project** (Type: map)
          - Description: The project to which the repo belongs.
          - Components:
            - Kind: map
            - Keys:
              - **id** (Type: str)
                - Description: The project's ID.
                - Pt-type: Id
              - **owner** (Type: map)
                - Description: Collection of identifying data for the project's owner.
                - Components:
                  - Kind: map
                  - Keys:
                    - **id** (Type: str)
                      - Description: The owner's ID.
                      - Pt-type: Id
                    - **type** (Type: str)
                      - Description: The owner type (`user` if a user or `org` if an organization).
                    - **uid** (Type: str)
                      - Description: The owner's UID.
                      - Pt-type: Uid
              - **uid** (Type: str)
                - Description: The project's UID.
                - Pt-type: Uid
        - **uid** (Type: str)
          - Description: The project's UID.
          - Pt-type: Uid

## Timestamp

**Type:** str

**Summary:** Timestamp

**Details:** Polytope uses full ISO 6801 timestamps. These are used to mark e.g. creation and modification times for various entities.

**Examples:**
- `2022-04-05T17:31:55.987Z`
- `2022-04-06T02:31:57.095+09:00`

## TriggerEventType

**Type:** str

**Summary:** Event types that can trigger a job

**Details:** Triggers can be specified for a project to create jobs when one or more of these events occur.

**Components:**
- Kind: enum
- Values:
  - Type: str, Value: "issue-created"
  - Type: str, Value: "git-tag-added"
  - Type: str, Value: "issue-deleted"
  - Type: str, Value: "git-tag-deleted"
  - Type: str, Value: "git-branch-updated"
  - Type: str, Value: "git-branch-added"
  - Type: str, Value: "issue-modified"
  - Type: str, Value: "pr-deleted"
  - Type: str, Value: "git-branch-deleted"
  - Type: str, Value: "pr-modified"
  - Type: str, Value: "git-tag-updated"
  - Type: str, Value: "pr-created"

## TriggerOnSpec

**Type:** map

**Summary:** Specification for when to run a job-creating trigger

**Details:** Used in [pt-ref:TriggerSpec]()s to specify when jobs should be triggered to run.

Specified either as a cron schedule expression or as a map specifying what events should trigger the job.

**Components:**
- Kind: map
- Keys:
  - **events** (Type: array, Optional: true)
    - Description: On what event or events the job is triggered.
    - Components:
      - Kind: list
      - Items:
        - Type: str
        - Pt-type: TriggerEventType
  - **schedule** (Type: str, Optional: true)
    - Description: A schedule for when the trigger schould be run.
    - Pt-type: CronExpr
  - **when** (Type: str, Optional: true)
    - Description: Code snippet that checks whether the job should be triggered.
    - Pt-type: Code

## TriggerSpec

**Type:** map

**Summary:** Specification for a job-creating trigger

**Details:** Specifies a trigger that can create jobs on a schedule or upon specified events.Triggers are activated in the Triggers interface. 

**Components:**
- Kind: map
- Keys:
  - **id** (Type: str)
    - Description: The trigger's ID.
    - Pt-type: Id
  - **info** (Type: str, Optional: true, Maybe: true)
    - Description: The trigger's description.
  - **on** (Type: array)
    - Description: Specification for when the trigger should be run – either on a schedule or on specified events.
    - Components:
      - Kind: list
      - Items:
        - Type: map
        - Pt-type: TriggerOnSpec
  - **template** (Type: str)
    - Description: Template defining the job to be run by the trigger.
    - Components:
      - Kind: either
      - Type: str
      - Cases:
        - Type: str (ID: arg0)
          - Pt-type: Id
        - Type: map (ID: arg1)
          - Pt-type: TemplateSpec
        - Type: str (ID: arg2)
          - Pt-type: Code

## Uid

**Type:** str

**Summary:** Unique identifier to any entity

**Details:** All Polytope entities (users, projects, jobs, and so on) can be referenced by a UID. UIDs are generated by Polytope at entity creation.

UIDs consist of 16 hexadecimal characters (`0-9`, `a-f`).

**Examples:**
- `04b6cd14b580000c`