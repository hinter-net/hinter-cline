# `hinter-cline`

- **Hinters** collect intelligence, compose personalized reports for other hinters, and exchange these reports using [`hinter-core`.](https://github.com/bbenligiray/hinter-core)
- **`hinter-cline`** is an AI-assisted environment that hinters use as a companion to [`hinter-core`](https://github.com/bbenligiray/hinter-core) to process information and compose reports.

See [instructions](./instructions.md) to run `hinter-cline` in a Docker container.

## Features

`hinter-cline` wraps two solutions in a Docker container for portability and security:
- [`code-server`,](https://github.com/coder/code-server) an enhanced fork of VS Code that you can use through your browser
- [Cline,](https://github.com/cline/cline) a coding assistant for VS Code

In addition, it implements `hinter-helper`, an interactive CLI tool for managing your `hinter` workflow. See [`hinter-helper.md`](./hinter-helper.md) for full documentation.

Its features include:
- Managing peers (add, edit, remove)
- Organizing peers into groups
- Creating and posting flexible report drafts to peers and groups

## `hinter-core-data/` additions

`hinter-cline` extends the [`hinter-core-data/` structure of `hinter-core`](https://github.com/bbenligiray/hinter-core?tab=readme-ov-file#hinter-core-data) by adding:

- `entries/`: A directory for your private knowledge base, including outgoing reports and report drafts.
- `.git/`:A [Git](https://git-scm.com/) directory containing the `hinter-core-data/` version history.
