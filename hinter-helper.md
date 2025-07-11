# `hinter-helper` CLI Tool

`hinter-helper` is an interactive command-line tool for managing peers, groups, and report drafts according to `hinter-cline` conventions.

## Running the Tool

Run `hinter-helper` using:

```sh
npm start
```

You will be presented with a menu of options.

## Menu Options

1.  **Create a report draft:** Interactively helps you create a new report draft.
    It prompts for a title and lets you select recipients from a list of known peers and groups.
2.  **Sync reports:** Scans the `entries/` directory for all report drafts and synchronizes them with the appropriate peers.
    This ensures that each peer's `outgoing` directory perfectly reflects the reports they are meant to receive, adding new ones and removing any that are no longer targeted at them.
3.  **Add a peer:** Guides you through adding a new peer by asking for a unique alias and their 64-character public key.
4.  **Manage a peer:** Lets you select a peer to update their alias or public key, or to delete them entirely.
5.  **Add a group:** Guides you through creating a new group and adding existing peers to it.
6.  **Manage a group:** Lets you select an existing group to add or remove peers from it.
7.  **Exit:** Closes the tool.

## Peer Groups

You can organize peers into groups to make sending reports to multiple peers easier.
A peer can belong to any number of groups.
The tool manages group memberships by adding a `groups` array to the `hinter-cline` object within each peer's `hinter.config.json` file.

### Example `hinter.config.json`

Here is an example of what a peer's configuration file looks like when they belong to two groups:

```json
{
  "publicKey": "a1b2c3d4...",
  "hinter-cline": {
    "groups": ["my-friends", "work-colleagues"]
  }
}
```

## Report Draft Frontmatter

The core of the reporting system is the YAML frontmatter at the top of each report draft file.
When you create a draft, the `to` and `except` fields are populated interactively, while `sourcePath` and `destinationPath` are left empty for you to fill in.

### Example: Sending a Markdown Report

This is the most common use case, where the body of the draft file itself is sent as the report.
If `sourcePath` and `destinationPath` are empty, they default to the relative path of the draft file.

```yaml
---
to: ["peer-alias-1", "group:my-friends"]
# Say peer-alias-3 is a member of my-friends and we don't want them to receive the report
except: ["peer-alias-3"]
# sourcePath is empty, so the body of this file is sent.
sourcePath: ""
# destinationPath is empty, so it defaults to the draft's path.
# If this draft is at "entries/foo/my-report.md", the destinations will be peers/*/outgoing/foo/my-report.md
destinationPath: ""
---
# My First Report

This is the content that will be sent to the peers.
The frontmatter above will be stripped out automatically.
```

### Example: Sending a Separate File

You can also use a draft as a "control file" to send other file types, like images or archives.

```yaml
---
to: ["peer-alias-2"]
except: []
# sourcePath points to the image we want to send.
sourcePath: "./images/diagram.png"
# The image will be saved to peers/peer-alias-2/outgoing/images/diagram.png on the peer's machine.
destinationPath: ""
---
# Control file for sending diagram.png

This body text will be ignored, because sourcePath is not empty.
```

### Example: Sending a Directory

You can also send an entire directory.
The directory structure will be preserved at the destination.

```yaml
---
to: ["peer-alias-1"]
except: []
# sourcePath points to the directory we want to send.
sourcePath: "./meme-folder"
# The contents of my-album will be saved to peers/peer-alias-1/outgoing/meme-folder
destinationPath: ""
---
```

### Key Fields Explained

- `to`: A list of recipients.
  Can contain individual peer aliases (e.g., `"peer-1"`) and groups (e.g., `"group:friends"`).
  If this array is empty, the report will not be sent to anyone.
- `except`: An array of peers or groups to exclude from the recipients.
- `sourcePath`: (Optional) The path to the file or directory to be sent, relative to the draft file.
  If left empty, the body of the draft itself (with frontmatter removed) is sent.
- `destinationPath`: (Optional) The destination path for the file or directory in the peer's `outgoing` directory.
  If left empty, it defaults to the name of the source file or directory.

### Important Rules

- **Validation:** The `syncReports` command is strict and will stop immediately if it encounters any of the following issues in a draft:
  - The YAML frontmatter is malformed.
  - The `to` or `except` fields are missing.
  - A peer or group listed in `to` or `except` does not exist.
  - The file specified in `sourcePath` cannot be found.
- **Synchronization:** The sync process is not additive.
  It ensures that a peer's `outgoing` directory is an exact mirror of the reports they should receive.
  - **Adds/Updates:** New or changed reports are written to the `outgoing` directory.
  - **Deletes:** Reports that were previously sent but are no longer targeted at a peer (e.g., the draft was deleted or the peer was removed from the `to` list) will be deleted from their `outgoing` directory.
- **YAML Stripping:** When the content of the draft file itself is being sent (i.e., `sourcePath` is empty), its YAML frontmatter is automatically removed. If an external Markdown file is specified in `sourcePath`, it is sent as-is, with its frontmatter intact.
