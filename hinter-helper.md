# `hinter-helper` CLI Tool

`hinter-helper` is an interactive command-line tool for managing peers and report drafts according to `hinter-cline` conventions.

## Running the Tool

To run the tool, navigate to the `hinter-cline` project root in your terminal and run:

```sh
npm start
```

You will be presented with a menu of options.

## Menu Options

1.  **Create a report draft:** Helps you create a new report draft `.md` file within the `hinter-core-data/entries/` directory.
2.  **Post reports:** Scans the `hinter-core-data/entries/` directory for all report drafts and posts them to peers according to the rules in their frontmatter.
3.  **Add a peer:** Prompts you to add a new peer by providing a unique, "slugified" alias and their 64-character public key.
4.  **Manage a peer:** Allows you to select a peer from a list and then choose to either change their alias, update their public key, or delete the peer entirely.
5.  **Add a group:** Lets you create a new group by giving it a name and selecting one or more peers to add to it.
6.  **Manage a group:** Allows you to select an existing group to manage. You can add or remove peers from the selected group.
7.  **Exit:** Closes the tool.

## Peer Groups

You can organize peers into groups to make sending reports to multiple peers easier. A peer can belong to any number of groups. This is managed by adding a `groups` array to the peer's `hinter.config.json` file, which the tool handles for you.

## Report Draft Frontmatter

The core of the reporting system is the YAML frontmatter at the top of each report draft (`.md`) file.
This block of text contains the instructions for the `Post all reports` command.

All fields are required.

```yaml
---
# To send to recipients, list their aliases or group names.
# Use 'group:' prefix for groups.
# If this list is empty, the report will be sent to NO ONE.
to: ['peer-alias-1', 'group:my-friends']

# To exclude recipients, list them here.
except: ['peer-alias-3']

# The path to the file you want to send, relative to this draft file.
sourcePath: "./source-image.png"

# The destination path for the file in the peer's 'outgoing' directory.
# This must include the filename.
destinationPath: "images/image-for-peer.png"
---

# Report Title

This is the body of the report draft. It is NOT sent when posting;
only the file at `sourcePath` is sent.
```

### Key Fields Explained

-   `to`: An array of recipients. Can contain individual peer aliases (e.g., `'peer-1'`) and groups (e.g., `'group:friends'`). **If this array is empty, the report will not be sent to anyone.**
-   `except`: An array of peers or groups to exclude from the `to` list.
-   `sourcePath`: The relative path to the file that will be sent. This can be the report draft itself (e.g., `./my-report.md`) or another file like an image or a zip archive.
-   `destinationPath`: The full path, including the filename, where the source file will be placed inside the recipient's `outgoing` directory. This allows you to organize files on your peer's machine.

### Important Rules

-   **Validation:** The `Post all reports` command will fail with an error if any alias listed in `to` or `except` does not correspond to a configured peer.
-   **YAML Stripping:** If the `sourcePath` points to a markdown (`.md`) file, its YAML frontmatter will be automatically removed before the file is sent to the peer.
