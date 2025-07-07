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

// --- Report Management ---

async function createDraft(entriesPath) {
    console.log('\n--- Create a Report Draft ---');
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
# To send to groups, list them: ['group:my-friends']
to: []
# To exclude peers or groups, list them.
except: []
sourcePath: "./${sourcePath}"
destinationPath: "./${sourcePath}"
---

# ${title}

`;
    await fs.writeFile(filePath, template);
    console.log(`\nDraft created at: ${filePath}`);
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
    const allGroups = await getAllGroups(peersPath);

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
                let expandedTo = new Set();
                to.forEach(item => {
                    if (item.startsWith('group:')) {
                        const groupName = item.substring(6);
                        (allGroups.get(groupName) || []).forEach(p => expandedTo.add(p));
                    } else {
                        expandedTo.add(item);
                    }
                });

                let expandedExcept = new Set();
                except.forEach(item => {
                    if (item.startsWith('group:')) {
                        const groupName = item.substring(6);
                        (allGroups.get(groupName) || []).forEach(p => expandedExcept.add(p));
                    } else {
                        expandedExcept.add(item);
                    }
                });

                const finalRecipients = [...expandedTo].filter(p => !expandedExcept.has(p));
                
                for (const peer of finalRecipients) {
                    if (!allPeerAliases.includes(peer)) {
                        throw new Error(`Invalid peer alias '${peer}' found in report draft.`);
                    }
                }
                return finalRecipients;
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
        if ((index + 1) % 4 === 0) {
            output += '\n';
        }
    });
    console.log(output);
}

async function addPeer(peersPath) {
    console.log('\n--- Add a Peer ---');
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

async function managePeer(peersPath) {
    console.log('\n--- Manage a Peer ---');
    const peers = await getPeerAliases(peersPath);
    if (peers.length === 0) {
        console.log('No peers to manage.');
        return;
    }

    displayPeers(peers);
    const choice = await question('Choose a peer to manage (number): ');
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

// --- Group Management ---

async function getPeerConfig(peerPath) {
    try {
        const configPath = path.join(peerPath, 'hinter.config.json');
        const content = await fs.readFile(configPath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return {}; // Return empty object if config doesn't exist or is invalid
    }
}

async function updatePeerConfig(peerPath, newConfig) {
    const configPath = path.join(peerPath, 'hinter.config.json');
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
}

async function getAllGroups(peersPath) {
    const groups = new Map();
    const peers = await getPeerAliases(peersPath);
    for (const peer of peers) {
        const config = await getPeerConfig(path.join(peersPath, peer));
        const peerGroups = config['hinter-cline']?.groups || [];
        for (const group of peerGroups) {
            if (!groups.has(group)) {
                groups.set(group, []);
            }
            groups.get(group).push(peer);
        }
    }
    return groups;
}

async function addGroup(peersPath) {
    console.log('\n--- Add a Group ---');
    const groupName = await question('Enter new group name: ');
    if (!isValidSlug(groupName)) {
        console.log('Invalid group name format.');
        return;
    }

    const allGroups = await getAllGroups(peersPath);
    if (allGroups.has(groupName)) {
        console.log('Error: A group with this name already exists.');
        return;
    }

    const peers = await getPeerAliases(peersPath);
    if (peers.length === 0) {
        console.log('No peers exist to add to a group.');
        return;
    }

    console.log('Available peers:');
    displayPeers(peers);
    const choices = await question('Select peers to add (comma-separated numbers, e.g., 1,3,4): ');
    const peerIndices = choices.split(',').map(n => parseInt(n.trim(), 10) - 1);

    for (const index of peerIndices) {
        if (!isNaN(index) && index >= 0 && index < peers.length) {
            const peerAlias = peers[index];
            const peerPath = path.join(peersPath, peerAlias);
            const config = await getPeerConfig(peerPath);
            
            config['hinter-cline'] = config['hinter-cline'] || {};
            config['hinter-cline'].groups = config['hinter-cline'].groups || [];
            if (!config['hinter-cline'].groups.includes(groupName)) {
                config['hinter-cline'].groups.push(groupName);
            }
            
            await updatePeerConfig(peerPath, config);
            console.log(`Added '${peerAlias}' to group '${groupName}'.`);
        }
    }
}

async function manageGroup(peersPath) {
    console.log('\n--- Manage a Group ---');
    const allGroups = await getAllGroups(peersPath);
    if (allGroups.size === 0) {
        console.log('No groups to manage.');
        return;
    }

    const groupNames = Array.from(allGroups.keys());
    console.log('Available groups:');
    groupNames.forEach((name, i) => console.log(`[${i+1}] ${name}`));
    
    const choice = await question('Choose a group to manage (number): ');
    const groupIndex = parseInt(choice.trim(), 10) - 1;

    if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= groupNames.length) {
        console.log('Invalid selection.');
        return;
    }

    const groupName = groupNames[groupIndex];
    const members = allGroups.get(groupName);
    console.log(`\nMembers of '${groupName}':`);
    displayPeers(members);

    // Remove peers
    const removeChoices = await question('Select members to REMOVE (comma-separated numbers, press Enter to skip): ');
    if (removeChoices) {
        const indicesToRemove = removeChoices.split(',').map(n => parseInt(n.trim(), 10) - 1);
        for (const index of indicesToRemove) {
            if (!isNaN(index) && index >= 0 && index < members.length) {
                const peerAlias = members[index];
                const peerPath = path.join(peersPath, peerAlias);
                const config = await getPeerConfig(peerPath);
                config['hinter-cline'].groups = config['hinter-cline'].groups.filter(g => g !== groupName);
                await updatePeerConfig(peerPath, config);
                console.log(`Removed '${peerAlias}' from group '${groupName}'.`);
            }
        }
    }

    // Add peers
    const allPeers = await getPeerAliases(peersPath);
    const nonMembers = allPeers.filter(p => !members.includes(p));
    if (nonMembers.length > 0) {
        console.log('\nPeers not in this group:');
        displayPeers(nonMembers);
        const addChoices = await question('Select peers to ADD (comma-separated numbers, press Enter to skip): ');
        if (addChoices) {
            const indicesToAdd = addChoices.split(',').map(n => parseInt(n.trim(), 10) - 1);
            for (const index of indicesToAdd) {
                if (!isNaN(index) && index >= 0 && index < nonMembers.length) {
                    const peerAlias = nonMembers[index];
                    const peerPath = path.join(peersPath, peerAlias);
                    const config = await getPeerConfig(peerPath);
                    config['hinter-cline'] = config['hinter-cline'] || {};
                    config['hinter-cline'].groups = config['hinter-cline'].groups || [];
                    if (!config['hinter-cline'].groups.includes(groupName)) {
                        config['hinter-cline'].groups.push(groupName);
                    }
                    await updatePeerConfig(peerPath, config);
                    console.log(`Added '${peerAlias}' to group '${groupName}'.`);
                }
            }
        }
    }
}

// --- Misc ---

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}


// --- Main Loop ---

async function main() {
    await fs.mkdir(PEERS_PATH, { recursive: true });
    await fs.mkdir(ENTRIES_PATH, { recursive: true });

    while (true) {
        console.log(`
Hinter Helper
------------------------------
1. Create a report draft
2. Post reports
3. Add a peer
4. Manage a peer
5. Add a group
6. Manage a group
7. Exit
------------------------------`);
        const choice = await question('Choose an option: ');

        switch (choice.trim()) {
            case '1': await createDraft(ENTRIES_PATH); break;
            case '2': await postReports(PEERS_PATH, ENTRIES_PATH); break;
            case '3': await addPeer(PEERS_PATH); break;
            case '4': await managePeer(PEERS_PATH); break;
            case '5': await addGroup(PEERS_PATH); break;
            case '6': await manageGroup(PEERS_PATH); break;
            case '7': console.log('Exiting.'); rl.close(); return;
            default: console.log('Invalid option.');
        }
        await question('\nPress Enter to continue...');
    }
}

main().catch(err => {
    console.error(`\nAn unexpected error occurred: ${err.message}`);
    rl.close();
});
