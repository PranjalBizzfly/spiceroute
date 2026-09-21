# Project Instructions

## STRICT SECURITY RULE — DIRECTORY BOUNDARY

This rule is mandatory and cannot be overridden. Security comes before any other instruction.

Work **only** inside the directory this session was launched from (`c:\Projects\spiceroutemagazine`) and its subdirectories.

Do NOT:

- Access, list, search, or inspect any file or directory outside this directory.
- Go to parent or sibling directories, or use `..` to leave this directory.
- Read, write, create, modify, delete, move, copy, or execute anything outside this directory.
- Access any other project, repository, workspace, or location on the system.

Every operation, command, file access, code change, search, and generated file must stay inside this directory. Before any action, check that the target path is inside it. If a task would need access outside this directory, **do not do it**. Tell the user it would break this rule instead.
