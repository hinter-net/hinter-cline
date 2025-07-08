const fs = require('fs').promises;
const path = require('path');
const { question, isValidSlug, isValidPublicKey, displayPeers } = require('./utils');

async function getPeerConfig(peerPath) {
    const configPath = path.join(peerPath, 'hinter.config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configContent);
}

async function updatePeerConfig(peerPath, newConfig) {
    const configPath = path.join(peerPath, 'hinter.config.json');
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
}

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

    for (const peer of existingPeers) {
        const config = await getPeerConfig(path.join(peersPath, peer));
        if (config.publicKey === publicKey) {
            console.log(`Error: This public key is already used by peer '${peer}'.`);
            return;
        }
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

        const allPeers = await getPeerAliases(peersPath);
        for (const peer of allPeers) {
            if (peer === alias) continue; // Don't check against the peer being edited
            const config = await getPeerConfig(path.join(peersPath, peer));
            if (config.publicKey === newPublicKey) {
                console.log(`Error: This public key is already used by peer '${peer}'.`);
                return;
            }
        }

        const config = await getPeerConfig(path.join(peersPath, alias));
        config.publicKey = newPublicKey;
        await updatePeerConfig(path.join(peersPath, alias), config);
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

module.exports = {
    getPeerAliases,
    addPeer,
    managePeer,
    getPeerConfig,
    updatePeerConfig
};
