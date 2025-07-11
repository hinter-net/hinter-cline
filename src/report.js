const fs = require("fs").promises;
const path = require("path");
const {
  question,
  slugify,
  selectFromList,
  extractFrontmatterAndContent,
  walk,
  removeEmptyDirectories,
} = require("./utils");
const { getPeerAliases, getPeerPath } = require("./peer");
const { getGroups } = require("./group");

function getEntriesPath(dataPath) {
  return path.join(dataPath, "entries");
}

async function createDraft(dataPath) {
  const entriesPath = getEntriesPath(dataPath);
  console.log("\n--- Create a report draft ---");
  const title = await question("Enter report title: ");
  if (!title) {
    console.log("Title cannot be empty.");
    return;
  }

  const peerAliases = await getPeerAliases(dataPath);
  const groups = await getGroups(dataPath);
  const groupAliases = Array.from(groups.keys());

  const availableRecipients = [
    ...groupAliases.map((groupAlias) => `group:${groupAlias}`),
    ...peerAliases,
  ];

  // Allow empty to for drafting
  let to;
  try {
    to = await selectFromList(
      availableRecipients,
      'Select recipients for "to" list.',
    );
  } catch (e) {
    console.log(e.message);
    return;
  }
  let except;
  try {
    except = await selectFromList(
      availableRecipients,
      'Select recipients for "except" list.',
    );
  } catch (e) {
    console.log(e.message);
    return;
  }

  const template = `---
to: ${JSON.stringify(to)}
except: ${JSON.stringify(except)}
sourcePath: ""
destinationPath: ""
---

# ${title}

`;
  const filePath = path.join(entriesPath, `${slugify(title)}.md`);
  await fs.writeFile(filePath, template);
  console.log(`Draft created at: ${filePath}`);
}

async function syncReports(dataPath) {
  const entriesPath = getEntriesPath(dataPath);
  console.log("\n--- Sync reports ---");
  const peerAliases = await getPeerAliases(dataPath);
  if (peerAliases.length === 0) {
    console.log("No peers configured.");
    return;
  }
  const groups = await getGroups(dataPath);

  const peerAliasToOutgoingFiles = new Map(
    peerAliases.map((alias) => [alias, new Map()]),
  );

  for await (const entryPath of walk(entriesPath)) {
    if (path.extname(entryPath) !== ".md") continue;

    const entryContent = await fs.readFile(entryPath, "utf8");
    const { frontmatter, body, error } =
      extractFrontmatterAndContent(entryContent);
    if (error) {
      throw new Error(
        `Error parsing YAML for report draft ${entryPath}: ${error.message}`,
      );
    }
    if (!frontmatter) {
      continue;
    }
    if (!Array.isArray(frontmatter.to) || !Array.isArray(frontmatter.except)) {
      throw new Error(
        `Report draft ${entryPath} is missing required fields (to, except).`,
      );
    }

    const { to, except } = frontmatter;
    const sourcePath = frontmatter.sourcePath || "";
    const destinationPath = frontmatter.destinationPath || "";

    const recipients = (() => {
      let expandedTo = new Set();
      to.forEach((item) => {
        if (item.startsWith("group:")) {
          const groupName = item.substring(6);
          if (!groups.has(groupName)) {
            throw new Error(
              `Invalid group name '${groupName}' found in report draft.`,
            );
          }
          groups.get(groupName).forEach((p) => expandedTo.add(p));
        } else {
          if (!peerAliases.includes(item)) {
            throw new Error(
              `Invalid peer alias '${item}' found in report draft.`,
            );
          }
          expandedTo.add(item);
        }
      });

      let expandedExcept = new Set();
      except.forEach((item) => {
        if (item.startsWith("group:")) {
          const groupName = item.substring(6);
          if (!groups.has(groupName)) {
            throw new Error(
              `Invalid group name '${groupName}' found in report draft.`,
            );
          }
          groups.get(groupName).forEach((p) => expandedExcept.add(p));
        } else {
          if (!peerAliases.includes(item)) {
            throw new Error(
              `Invalid peer alias '${item}' found in report draft.`,
            );
          }
          expandedExcept.add(item);
        }
      });

      return [...expandedTo].filter((p) => !expandedExcept.has(p));
    })();

    if (!sourcePath) {
      const destination =
        destinationPath || path.relative(entriesPath, entryPath);
      for (const peerAlias of recipients) {
        peerAliasToOutgoingFiles
          .get(peerAlias)
          .set(destination, { type: "content", data: body });
      }
    } else {
      const absoluteSourcePath = path.resolve(
        path.dirname(entryPath),
        sourcePath,
      );
      let stats;
      try {
        stats = await fs.stat(absoluteSourcePath);
      } catch (e) {
        throw new Error(
          `Error accessing source path ${absoluteSourcePath} for report draft ${entryPath}`,
        );
      }

      if (stats.isDirectory()) {
        const destination =
          destinationPath || path.basename(absoluteSourcePath);
        for await (const fileInDir of walk(absoluteSourcePath)) {
          const relativePath = path.relative(absoluteSourcePath, fileInDir);
          const finalDest = path.join(destination, relativePath);
          for (const peerAlias of recipients) {
            peerAliasToOutgoingFiles
              .get(peerAlias)
              .set(finalDest, { type: "file", path: fileInDir });
          }
        }
      } else {
        const destination =
          destinationPath || path.basename(absoluteSourcePath);
        for (const peerAlias of recipients) {
          peerAliasToOutgoingFiles
            .get(peerAlias)
            .set(destination, { type: "file", path: absoluteSourcePath });
        }
      }
    }
  }

  let postCount = 0;
  let removalCount = 0;
  for (const peerAlias of peerAliases) {
    const peerOutgoingPath = path.join(
      getPeerPath(dataPath, peerAlias),
      "outgoing",
    );
    await fs.mkdir(peerOutgoingPath, { recursive: true });

    const desiredPeerOutgoingFiles = peerAliasToOutgoingFiles.get(peerAlias);
    const actualPeerOutgoingFiles = new Set();
    for await (const file of walk(peerOutgoingPath)) {
      actualPeerOutgoingFiles.add(path.relative(peerOutgoingPath, file));
    }

    for (const file of actualPeerOutgoingFiles) {
      if (!desiredPeerOutgoingFiles.has(file)) {
        await fs.unlink(path.join(peerOutgoingPath, file));
        removalCount++;
      }
    }

    for (const [file, source] of desiredPeerOutgoingFiles) {
      const destPath = path.join(peerOutgoingPath, file);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      if (source.type === "file") {
        await fs.cp(source.path, destPath);
      } else {
        await fs.writeFile(destPath, source.data);
      }
      postCount++;
    }
    await removeEmptyDirectories(peerOutgoingPath);
  }

  console.log(
    `Finished. Synced ${postCount} reports and removed ${removalCount} obsolete reports.`,
  );
}

module.exports = {
  createDraft,
  syncReports,
};
