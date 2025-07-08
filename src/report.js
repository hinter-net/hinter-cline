const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { question, slugify, selectFromList } = require('./utils');
const { getPeerAliases, getPeerPath } = require('./peer');
const { getGroups } = require('./group');

function getEntriesPath(dataPath) {
    return path.join(dataPath, 'entries');
}

async function createDraft(dataPath) {
    const entriesPath = getEntriesPath(dataPath);
    console.log('\n--- Create a report draft ---');
    const title = await question('Enter report title: ');
    if (!title) {
        console.log('Title cannot be empty.');
        return;
    }

    const peerAliases = await getPeerAliases(dataPath);
    const groups = await getGroups(dataPath);
    const groupAliases = Array.from(groups.keys());

    const availableRecipients = [...groupAliases.map(groupAlias => `group:${groupAlias}`), ...peerAliases];

    // Allow empty to for drafting
    let to;
    try {
        to = await selectFromList(availableRecipients, 'Select recipients for "to" list.');
    } catch (e) {
        console.log(e.message);
        return;
    }
    let except;
    try {
        except = await selectFromList(availableRecipients, 'Select recipients for "except" list.');
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

async function* walk(dir) {
    for await (const d of await fs.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* walk(entry);
        else if (d.isFile()) yield entry;
    }
}

function extractFrontmatterAndContent(text) {
    const match = text.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!match) {
        return { frontmatter: null, body: text, error: null };
    }

    try {
        const frontmatter = yaml.load(match[1]);
        const body = text.slice(match[0].length).trim();
        return { frontmatter, body, error: null };
    } catch (e) {
        return { frontmatter: null, body: text, error: e };
    }
}

async function postReports(dataPath) {
    const entriesPath = getEntriesPath(dataPath);
    console.log('\n--- Post reports ---');
    const peerAliases = await getPeerAliases(dataPath);
    if (peerAliases.length === 0) {
        console.log('No peers configured.');
        return;
    }
    const groups = await getGroups(dataPath);

    let postCount = 0;
    try {
        for await (const filePath of walk(entriesPath)) {
            if (path.extname(filePath) !== '.md') continue;

            const reportDraftContent = await fs.readFile(filePath, 'utf8');
            const { frontmatter, body, error } = extractFrontmatterAndContent(reportDraftContent);
            if (error) {
                throw new Error(`Error parsing YAML for report draft ${filePath}: ${error.message}`);
            }
            if (!frontmatter) {
                continue;
            }
            if (
                !Array.isArray(frontmatter.to) ||
                !Array.isArray(frontmatter.except)
            ) {
                throw new Error(`Report draft ${filePath} is missing required fields (to, except).`);
            }

            const { to, except } = frontmatter;
            const sourcePath = frontmatter.sourcePath || '';

            let destinationPath = frontmatter.destinationPath;
            if (!destinationPath) {
                destinationPath = sourcePath || path.relative(entriesPath, filePath);
            }

            let finalContent;
            if (!sourcePath) {
                finalContent = body;
            } else {
                const absoluteSourcePath = path.resolve(path.dirname(filePath), sourcePath);
                try {
                    const sourceContentBuffer = await fs.readFile(absoluteSourcePath);
                    if (path.extname(absoluteSourcePath) === '.md') {
                        finalContent = extractFrontmatterAndContent(sourceContentBuffer.toString('utf8')).content;
                    } else {
                        finalContent = sourceContentBuffer;
                    }
                } catch (e) {
                    throw new Error(`Error reading source file ${absoluteSourcePath} for report draft ${filePath}`);
                }
            }

            const recipients = (() => {
                let expandedTo = new Set();
                to.forEach(item => {
                    if (item.startsWith('group:')) {
                        const groupName = item.substring(6);
                        if (!groups.has(groupName)) {
                            throw new Error(`Invalid group name '${groupName}' found in report draft.`);
                        }
                        groups.get(groupName).forEach(p => expandedTo.add(p));
                    } else {
                        expandedTo.add(item);
                    }
                });

                let expandedExcept = new Set();
                except.forEach(item => {
                    if (item.startsWith('group:')) {
                        const groupName = item.substring(6);
                        if (!groups.has(groupName)) {
                            throw new Error(`Invalid group name '${groupName}' found in report draft.`);
                        }
                        groups.get(groupName).forEach(p => expandedExcept.add(p));
                    } else {
                        expandedExcept.add(item);
                    }
                });

                const finalRecipients = [...expandedTo].filter(p => !expandedExcept.has(p));

                for (const peer of finalRecipients) {
                    if (!peerAliases.includes(peer)) {
                        throw new Error(`Invalid peer alias '${peer}' found in report draft.`);
                    }
                }
                return finalRecipients;
            })();

            for (const peerAlias of recipients) {
                const destPath = path.join(getPeerPath(dataPath, peerAlias), 'outgoing', destinationPath);
                await fs.mkdir(path.dirname(destPath), { recursive: true });
                await fs.writeFile(destPath, finalContent);
                postCount++;
            }
        }
        console.log(`Finished. A total of ${postCount} posts were made.`);
    } catch (e) {
        console.log(`Error during posting: ${e.message}`);
    }
}

module.exports = {
    createDraft,
    postReports
};
