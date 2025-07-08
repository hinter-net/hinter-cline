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
2.  **Post reports:** Scans the `entries/` directory for all report drafts and posts them to the appropriate peers based on the rules in their frontmatter.
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
    "groups": [
      "my-friends",
      "work-colleagues"
    ]
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
to: [ "peer-alias-1", "group:my-friends" ]
# Say peer-alias-3 is a member of my-friends and we don't want them to receive the report
except: [ "peer-alias-3" ]
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
to: [ "peer-alias-2" ]
except: []
# sourcePath points to the image we want to send.
sourcePath: "./images/diagram.png"
# The image will be saved to peers/peer-alias-2/outgoing/images/diagram.png on the peer's machine.
destinationPath: ""
---

# Control file for sending diagram.png

This body text will be ignored, because sourcePath is not empty.
```

### Key Fields Explained

- `to`: A list of recipients.
Can contain individual peer aliases (e.g., `"peer-1"`) and groups (e.g., `"group:friends"`).
If this array is empty, the report will not be sent to anyone.
- `except`: An array of peers or groups to exclude from the recipients.
- `sourcePath`: (Optional) The path to the file to be sent, relative to the draft file.
If left empty, the body of the draft itself (with frontmatter removed) is sent.
- `destinationPath`: (Optional)  The destination path for the file in the peer's `outgoing` directory.
If left empty, its default depends on `sourcePath`:
  - If `sourcePath` is also empty, `destinationPath` defaults to the relative path of the draft file.
  - If `sourcePath` is set, `destinationPath` defaults to the same path.

### Important Rules

- **Validation:** The `postReports` command is strict and will stop if it encounters any of the following issues in a draft:
  - The YAML frontmatter is malformed.
  - The `to` or `except` fields are missing.
  - A peer or group listed in `to` or `except` does not exist.
  - The file specified in `sourcePath` cannot be found.
- **Additive Posting:** The posting process is additive.
It only copies files to peers' `outgoing` directories and will overwrite existing files if they have the same name and path.
It does not delete files that were posted previously, even if a peer is later removed from a report's recipient list.
- **YAML Stripping:** If the file being sent is a markdown file (either the draft itself or an external `.md` file), its YAML frontmatter is automatically removed before sending.
