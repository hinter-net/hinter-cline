# `hinter-cline`

- **Hinters** use collect intelligence, compose personalized reports for other hinters, and exchange these reports using [`hinter-core`.](https://github.com/bbenligiray/hinter-core)
- **`hinter-cline`** is an AI-assisted environment that hinters use as a sidecar to [`hinter-core`](https://github.com/bbenligiray/hinter-core) to process information and compose reports.

See [instructions](./instructions.md) to run `hinter-cline` in a Docker container.

## Features

`hinter-cline` wraps two solutions in a Docker container for portability and security:
- [`code-server`,](https://github.com/coder/code-server) an enhanced fork of VS Code that you can use through your browser
- [Cline,](https://github.com/cline/cline) an open-source, fully-offline coding assistant for VS Code

In addition, it implements `hinter-helper`, a simple CLI tool that you use in a `hinter-cline` container for the following hinter workflows:
- Adding, editing, or removing peers
- Creating report drafts
- Posting reports to peers

## `hinter-core-data/` additions

`hinter-cline` extends the [`hinter-core-data/` structure of `hinter-core`](https://github.com/bbenligiray/hinter-core?tab=readme-ov-file#hinter-core-data) by adding:

- `entries/`: A directory for your private knowledge base, including report drafts.
- `.git/`:[Git](https://git-scm.com/) directory containing the `hinter-core-data/` version history.
