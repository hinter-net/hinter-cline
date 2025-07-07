const fs = require('fs').promises;
const path = require('path');
const { question, isValidSlug, displayPeers } = require('./utils');
const { getPeerAliases, getPeerConfig, updatePeerConfig } = require('./peer');

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
    const currentMembers = allGroups.get(groupName) || [];
    const nonMembers = allPeers.filter(p => !currentMembers.includes(p));
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

module.exports = {
    getAllGroups,
    addGroup,
    manageGroup
};
