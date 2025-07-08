# `hinter-helper` CLI Tool

`hinter-helper` is an interactive command-line tool for managing peers, groups, and report drafts according to `hinter-cline` conventions.

## Running the Tool

To run the tool, navigate to the `hinter-cline` project root in your terminal and run:

```sh
npm start
```

You will be presented with a menu of options.

## Menu Options

1.  **Create a report draft:** Interactively helps you create a new report draft.
It will prompt you for a title and then allow you to select recipients (`to` and `except` lists) from a list of all known peers and groups.
2.  **Post reports:** Scans the `hinter-core-data/entries/` directory for all report drafts and posts them to peers according to the rules in their frontmatter.
3.  **Add a peer:** Prompts you to add a new peer by providing a unique, "slugified" alias and their 64-character public key.
4.  **Manage a peer:** Allows you to select a peer from a list and then choose to either change their alias, update their public key, or delete the peer entirely.
5.  **Add a group:** Lets you create a new group by giving it a name and selecting one or more peers to add to it.
6.  **Manage a group:** Allows you to select an existing group to manage. You can add or remove peers from the selected group.
7.  **Exit:** Closes the tool.

## Peer Groups

You can organize peers into groups to make sending reports to multiple peers easier.
A peer can belong to any number of groups.
This is managed by adding a `groups` array to the peer's `hinter.config.json` file, which the tool handles for you via the "Add a group" and "Manage a group" menu options.

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

The core of the reporting system is the YAML frontmatter at the top of each report draft (`.md`) file.

When you use the "Create a report draft" option, the `to` and `except` fields are populated for you based on your interactive selections.
The `sourcePath` and `destinationPath` fields are initially empty, and can often be left that way.

### Example: Sending a Markdown Report

This is the most common use case.
The body of the draft file itself is sent as the report.
If `sourcePath` and `destinationPath` are empty, they default to the path of the draft file itself.

```yaml
---
to: [ "peer-alias-1", "group:my-friends" ]
# peer-alias-3 is a member of my-friends
except: [ "peer-alias-3" ]
# sourcePath is empty, so the body of this file is sent.
sourcePath: ""
# destinationPath is empty, so it defaults to the draft's path.
# If this draft is at "entries/foo/my-report.md", the destination will be "foo/my-report.md".
destinationPath: ""
---

# My First Report

This is the content that will be sent to the peers.
The frontmatter above will be stripped out automatically.
```

### Example: Sending a Separate File

You can also use a draft file as a "control file" to send other types of files, like images or archives.

```yaml
---
to: [ "peer-alias-2" ]
except: []
# sourcePath points to the image we want to send.
sourcePath: "./images/diagram.png"
# The image will be saved to images/diagram.png on the peer's machine.
destinationPath: ""
---

# Control file for sending diagram.png

This body text will be ignored, because sourcePath is not empty.
```

### Key Fields Explained

-   `to`: An array of recipients. Can contain individual peer aliases (e.g., `"peer-1"`) and groups (e.g., `"group:friends"`).
If this array is empty, the report will not be sent to anyone.
-   `except`: An array of peers or groups to exclude from the `to` list.
-   `sourcePath`: (Optional) The relative path to the file that will be sent.
If left empty, the body of the draft file itself (with frontmatter removed) will be sent.
-   `destinationPath`: (Optional) The full path, including the filename, where the source file will be placed inside the recipient's `outgoing` directory.
If left empty, it defaults to the relative path of the report draft file.

### Important Rules

-   **Validation:** The `postReports` command is strict and will stop with an error if it encounters any of the following issues in a report draft:
    -   The YAML frontmatter cannot be parsed.
    -   The `to` or `except` fields are missing.
    -   An alias or group name listed in `to` or `except` does not exist.
    -   The file specified in `sourcePath` cannot be read.
-   **Additive Posting:** The posting process is additive. It only copies files to the specified peers' `outgoing` directories.
It does not delete files that were posted previously, even if a peer is later removed from a report's recipient list.
-   **YAML Stripping:** If the file being sent is a markdown file (either the draft itself or a separate `.md` file pointed to by `sourcePath`), its YAML frontmatter will be automatically removed before the file is sent.
