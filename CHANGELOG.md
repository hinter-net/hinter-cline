# hinter-cline

## 0.2.0

### Minor Changes

- 34d3fac: Add an implicit group called "all" that includes all peers.
  If you have already created a group with this name on v0.1, it will be overriden so you are recommended to remove it.

### Patch Changes

- e3bc2ed: Docker image working directory name is updated to fix the code-server title that appears on the browser.
  This requires changes to how the volumes are mounted in the Docker command that runs the image.
- 515ed71: Report draft filenames are no longer being kebabified (we still attempt to sanitize them)

## 0.1.1

### Patch Changes

- 44a7fc3: Update .clinerules according to the released version of 0.1.0
- 8212c8d: Copy the helper to the image
- f79af99: Create .gitignore before initializing hinter-core-data/ as a git repo
