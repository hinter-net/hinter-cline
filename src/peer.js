const fs = require('fs').promises;
const path = require('path');
const { question, isValidSlug, isValidPublicKey, displayPeers } = require('./utils');

function getPeersPath(dataPath) {
    return path.join(dataPath, 'peers');
}

function getPeerPath(dataPath, alias) {
    return path.join(getPeersPath(dataPath), alias);
}

async function getPeerConfig(dataPath, alias) {
    const configPath = path.join(getPeerPath(dataPath, alias), 'hinter.config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configContent);
}

async function updatePeerConfig(dataPath, alias, newConfigContent) {
    const configPath = path.join(getPeersPath(dataPath), alias, 'hinter.config.json');
    await fs.writeFile(configPath, JSON.stringify(newConfigContent, null, 2));
}

async function getPeerAliases(dataPath) {
    const peersDirectoryContents = await fs.readdir(getPeersPath(dataPath), { withFileTypes: true });
    return peersDirectoryContents
        .filter(peersDirectoryContent => peersDirectoryContent.isDirectory())
        .map(peerDirectory => peerDirectory.name);
}

async function addPeer(dataPath) {
    console.log('\n--- Add a Peer ---');
    const newPeerAlias = await question('Enter peer alias (e.g., alice-work): ');
    if (!isValidSlug(newPeerAlias)) {
        console.log('Invalid alias format. Use lowercase letters, numbers, and single hyphens.');
        return;
    }

    const existingPeerAliases = await getPeerAliases(dataPath);
    if (existingPeerAliases.includes(newPeerAlias)) {
        console.log('Error: A peer with this alias already exists.');
        return;
    }

    const publicKey = await question('Enter peer public key (64 hex characters): ');
    if (!isValidPublicKey(publicKey)) {
        console.log('Invalid public key format.');
        return;
    }

    for (const peerAlias of existingPeerAliases) {
        const config = await getPeerConfig(dataPath, peerAlias);
        if (config.publicKey === publicKey) {
            console.log(`Error: This public key is already used by peer '${peerAlias}'.`);
            return;
        }
    }

    await fs.mkdir(getPeerPath(dataPath, newPeerAlias));
    await updatePeerConfig(dataPath, newPeerAlias, { publicKey });
    console.log(`\nPeer '${newPeerAlias}' added successfully.`);
}

async function managePeer(dataPath) {
    console.log('\n--- Manage a Peer ---');
    const peerAliases = await getPeerAliases(dataPath);
    if (peerAliases.length === 0) {
        console.log('No peers to manage.');
        return;
    }

    displayPeers(peerAliases);
    const choice = await question('Choose a peer to manage (number): ');
    const peerIndex = parseInt(choice, 10) - 1;

    if (isNaN(peerIndex) || peerIndex < 0 || peerIndex >= peerAliases.length) {
        console.log('Invalid selection.');
        return;
    }

    const managedPeerAlias = peerAliases[peerIndex];
    const editChoice = await question(`What do you want to do with '${managedPeerAlias}'? (1. Change Alias, 2. Change Public Key, 3. Delete Peer): `);

    if (editChoice === '1') {
        const newAlias = await question(`Enter new alias for '${managedPeerAlias}': `);
        if (!isValidSlug(newAlias)) {
            console.log('Invalid alias format.');
            return;
        }
        if (peerAliases.includes(newAlias)) {
            console.log('Error: A peer with this alias already exists.');
            return;
        }
        await fs.rename(getPeerPath(dataPath, managedPeerAlias), getPeerPath(dataPath, newAlias));
        console.log(`Peer alias updated from '${managedPeerAlias}' to '${newAlias}'.`);
    } else if (editChoice === '2') {
        const newPublicKey = await question(`Enter new public key for '${managedPeerAlias}': `);
        if (!isValidPublicKey(newPublicKey)) {
            console.log('Invalid public key format.');
            return;
        }

        for (const peerAlias of peerAliases) {
            if (peerAlias === managedPeerAlias) continue; // Don't check against the peer being edited
            const config = await getPeerConfig(dataPath, peerAlias);
            if (config.publicKey === newPublicKey) {
                console.log(`Error: This public key is already used by peer '${peerAlias}'.`);
                return;
            }
        }

        const config = await getPeerConfig(dataPath, managedPeerAlias);
        config.publicKey = newPublicKey;
        await updatePeerConfig(dataPath, managedPeerAlias, config);
        console.log(`Public key for '${managedPeerAlias}' updated.`);
    } else if (editChoice === '3') {
        const confirm = await question(`Are you sure you want to delete peer '${managedPeerAlias}'? (y/[n]): `);
        if (confirm.toLowerCase() === 'y') {
            await fs.rm(getPeerPath(dataPath, managedPeerAlias), { recursive: true, force: true });
            console.log(`Peer '${managedPeerAlias}' deleted successfully.`);
        } else {
            console.log('Deletion cancelled.');
        }
    } else {
        console.log('Invalid choice.');
    }
}

module.exports = {
    getPeerAliases,
    addPeer,
    managePeer,
    getPeerConfig,
    updatePeerConfig
};
