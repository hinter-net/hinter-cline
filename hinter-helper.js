#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => {
        rl.question(query, resolve);
    });
}

// --- Path and Config ---

const HINTER_CORE_DATA_PATH = path.join(__dirname, 'hinter-core-data');
const PEERS_PATH = path.join(HINTER_CORE_DATA_PATH, 'peers');
const ENTRIES_PATH = path.join(HINTER_CORE_DATA_PATH, 'entries');

// --- Validation ---

function isValidSlug(slug) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function isValidPublicKey(key) {
    return /^[a-f0-9]{64}$/.test(key);
}

// --- Peer Management ---

async function getPeerAliases(peersPath) {
    try {
        const dirents = await fs.readdir(peersPath, { withFileTypes: true });
        return dirents
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

function displayPeers(peers) {
    let output = '';
    peers.forEach((peer, index) => {
        output += `[${index + 1}]`.padEnd(5) + `${peer.padEnd(20)}`;
        if ((index + 1) % 4 === 0) { // Adjusted to 4 for better alignment with brackets
            output += '\n';
        }
    });
    console.log(output);
}

async function addPeer(peersPath) {
    console.log('\n--- Add a New Peer ---');
    const alias = await question('Enter peer alias (e.g., alice-work): ');
    if (!isValidSlug(alias)) {
        console.log('Invalid alias format. Use lowercase letters, numbers, and single hyphens.');
        return;
    }

    const existingPeers = await getPeerAliases(peersPath);
    if (existingPeers.includes(alias)) {
        console.log('Error: A peer with this alias already exists.');
        return;
    }

    const publicKey = await question('Enter peer public key (64 hex characters): ');
    if (!isValidPublicKey(publicKey)) {
        console.log('Invalid public key format.');
        return;
    }

    const peerPath = path.join(peersPath, alias);
    await fs.mkdir(peerPath);
    await fs.writeFile(path.join(peerPath, 'hinter.config.json'), JSON.stringify({ publicKey }, null, 2));
    console.log(`\nPeer '${alias}' added successfully.`);
}

async function editOrRemovePeer(peersPath) {
    console.log('\n--- Edit or Remove a Peer ---');
    const peers = await getPeerAliases(peersPath);
    if (peers.length === 0) {
        console.log('No peers to edit or remove.');
        return;
    }

    displayPeers(peers);
    const choice = await question('Choose a peer to edit or remove (number): ');
    const peerIndex = parseInt(choice, 10) - 1;

    if (isNaN(peerIndex) || peerIndex < 0 || peerIndex >= peers.length) {
        console.log('Invalid selection.');
        return;
    }

    const alias = peers[peerIndex];
    const editChoice = await question(`What do you want to do with '${alias}'? (1. Change Alias, 2. Change Public Key, 3. Delete Peer): `);

    if (editChoice === '1') {
        const newAlias = await question(`Enter new alias for '${alias}': `);
        if (!isValidSlug(newAlias)) {
            console.log('Invalid alias format.');
            return;
        }
        if (peers.includes(newAlias)) {
            console.log('Error: A peer with this alias already exists.');
            return;
        }
        await fs.rename(path.join(peersPath, alias), path.join(peersPath, newAlias));
        console.log(`Peer alias updated from '${alias}' to '${newAlias}'.`);
    } else if (editChoice === '2') {
        const newPublicKey = await question(`Enter new public key for '${alias}': `);
        if (!isValidPublicKey(newPublicKey)) {
            console.log('Invalid public key format.');
            return;
        }
        await fs.writeFile(
            path.join(peersPath, alias, 'hinter.config.json'),
            JSON.stringify({ publicKey: newPublicKey }, null, 2)
        );
        console.log(`Public key for '${alias}' updated.`);
    } else if (editChoice === '3') {
        const confirm = await question(`Are you sure you want to delete peer '${alias}'? (y/[n]): `);
        if (confirm.toLowerCase() === 'y') {
            await fs.rm(path.join(peersPath, alias), { recursive: true, force: true });
            console.log(`Peer '${alias}' deleted successfully.`);
        } else {
            console.log('Deletion cancelled.');
        }
    } else {
        console.log('Invalid choice.');
    }
}

// --- Report Management ---

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function createDraft(entriesPath) {
    console.log('\n--- Create a New Report Draft ---');
    const title = await question('Enter report title: ');
    if (!title) {
        console.log('Title cannot be empty.');
        return;
    }

    const relativeDir = await question('(Optional) Enter directory to save in (e.g., reports/2025/): ');
    const finalDir = path.join(entriesPath, relativeDir);
    await fs.mkdir(finalDir, { recursive: true });

    const filename = `${slugify(title)}.md`;
    const filePath = path.join(finalDir, filename);

    const sourcePath = path.join(relativeDir, filename).replace(/\\/g, '/'); // Ensure forward slashes

    const template = `---
# To send to specific peers, list them: ['peer-alias-1', 'peer-alias-2']
to: []
# To exclude peers, list them: ['peer-alias-3']
except: []
sourcePath: "./${sourcePath}"
destinationPath: "./${sourcePath}"
---

# ${title}

`;
    await fs.writeFile(filePath, template);
    console.log(`\nDraft control file created at: ${filePath}`);
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
        return { frontmatter: {}, content: text };
    }

    try {
        const frontmatter = yaml.load(match[1]);
        const content = text.slice(match[0].length).trim();
        return { frontmatter, content };
    } catch (e) {
        return { frontmatter: null, content: text, error: e };
    }
}

async function postReports(peersPath, entriesPath) {
    console.log('\n--- Post Reports ---');
    const allPeerAliases = await getPeerAliases(peersPath);
    if (allPeerAliases.length === 0) {
        console.log('No peers configured.');
        return;
    }

    let postCount = 0;
    try {
        for await (const filePath of walk(entriesPath)) {
        if (path.extname(filePath) !== '.md') continue;

        const reportDraftContent = await fs.readFile(filePath, 'utf8');
        const { frontmatter, error } = extractFrontmatterAndContent(reportDraftContent);

        if (error || !frontmatter) {
            console.error(`Error parsing YAML for report draft ${filePath}. Skipping.`);
            continue;
        }

        if (
            !frontmatter.sourcePath || 
            !frontmatter.destinationPath ||
            !Array.isArray(frontmatter.to) ||
            !Array.isArray(frontmatter.except)
        ) {
            console.error(`Error: Report draft ${filePath} is missing required fields (sourcePath, destinationPath, to, except).`);
            continue;
        }

        const { to, except, sourcePath, destinationPath } = frontmatter;

        const absoluteSourcePath = path.resolve(path.dirname(filePath), sourcePath);
        let sourceContentBuffer;
        try {
            sourceContentBuffer = await fs.readFile(absoluteSourcePath);
        } catch (e) {
            console.error(`Error reading source file ${absoluteSourcePath} for report draft ${filePath}`);
            continue;
        }

        let finalContent = sourceContentBuffer;
        if (path.extname(absoluteSourcePath) === '.md') {
            const { content } = extractFrontmatterAndContent(sourceContentBuffer.toString('utf8'));
            finalContent = content;
        }

        const recipients = (() => {
            for (const peer of [...to, ...except]) {
                if (!allPeerAliases.includes(peer)) {
                    throw new Error(`Invalid peer alias '${peer}' found in report draft.`);
                }
            }
            return to.filter(p => !except.includes(p));
        })();

        for (const peerAlias of recipients) {
            const destPath = path.join(peersPath, peerAlias, 'outgoing', destinationPath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.writeFile(destPath, finalContent);
            console.log(`Posted '${path.basename(sourcePath)}' to '${peerAlias}' at '${destinationPath}'`);
            postCount++;
        }
    }
    console.log(`\nFinished. A total of ${postCount} posts were made.`);
    } catch (e) {
        console.error(`\nError during posting: ${e.message}`);
    }
}


// --- Main Loop ---

async function main() {
    await fs.mkdir(PEERS_PATH, { recursive: true });
    await fs.mkdir(ENTRIES_PATH, { recursive: true });

    while (true) {
        console.log(`
Hinter Helper
------------------------------
1. Add a new peer
2. Edit or remove a peer
3. Create a new report draft
4. Post all reports
5. Exit
------------------------------`);
        const choice = await question('Choose an option: ');

        switch (choice.trim()) {
            case '1': await addPeer(PEERS_PATH); break;
            case '2': await editOrRemovePeer(PEERS_PATH); break;
            case '3': await createDraft(ENTRIES_PATH); break;
            case '4': await postReports(PEERS_PATH, ENTRIES_PATH); break;
            case '5': console.log('Exiting.'); rl.close(); return;
            default: console.log('Invalid option.');
        }
        await question('\nPress Enter to continue...');
    }
}

main().catch(err => {
    console.error(`\nAn unexpected error occurred: ${err.message}`);
    rl.close();
});
