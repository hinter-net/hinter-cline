const { question, isValidSlug, selectFromList, displayList } = require('./utils');
const { getPeerAliases, getPeerConfig, updatePeerConfig } = require('./peer');

async function getGroups(dataPath) {
    const groups = new Map();
    const peerAliases = await getPeerAliases(dataPath);
    for (const peerAlias of peerAliases) {
        const config = await getPeerConfig(dataPath, peerAlias);
        const peerGroups = config['hinter-cline']?.groups || [];
        for (const group of peerGroups) {
            if (!groups.has(group)) {
                groups.set(group, []);
            }
            groups.get(group).push(peerAlias);
        }
    }
    return groups;
}

async function addGroup(dataPath) {
    console.log('\n--- Add a group ---');
    const newGroupAlias = await question('Enter new group alias (e.g., ai-developers): ');
    if (!isValidSlug(newGroupAlias)) {
        console.log('Invalid alias format. Use lowercase letters, numbers, and single hyphens.');
        return;
    }

    const groups = await getGroups(dataPath);
    if (groups.has(newGroupAlias)) {
        console.log('A group with this alias already exists.');
        return;
    }

    const peerAliases = await getPeerAliases(dataPath);
    if (peerAliases.length === 0) {
        console.log('No peers exist to add to a group.');
        return;
    }

    let selectedPeerAliases;
    try {
        selectedPeerAliases = await selectFromList(peerAliases, 'Select peers to add.');
    } catch (e) {
        console.log(e.message);
        return;
    }
    if (selectedPeerAliases.length === 0) {
        console.log('No peer selected. Group not added.');
        return;
    }
    for (const peerAlias of selectedPeerAliases) {
        const config = await getPeerConfig(dataPath, peerAlias);

        config['hinter-cline'] = config['hinter-cline'] || {};
        config['hinter-cline'].groups = config['hinter-cline'].groups || [];
        if (!config['hinter-cline'].groups.includes(newGroupAlias)) {
            config['hinter-cline'].groups.push(newGroupAlias);
        }

        await updatePeerConfig(dataPath, peerAlias, config);
        console.log(`Added '${peerAlias}' to group '${newGroupAlias}'.`);
    }
}

async function manageGroup(dataPath) {
    console.log('\n--- Manage a group ---');
    const groups = await getGroups(dataPath);
    if (groups.size === 0) {
        console.log('No groups to manage.');
        return;
    }

    const groupAliases = Array.from(groups.keys());
    let selectedGroupAliases;
    try {
        selectedGroupAliases = await selectFromList(groupAliases, 'Select a group to manage.', { allowMultiple: false });
    } catch (e) {
        console.log(e.message);
        return;
    }
    if (selectedGroupAliases.length === 0) {
        console.log('No group selected.');
        return;
    }
    const managedGroupAlias = selectedGroupAliases[0];
    const managedGroupPeerAliases = groups.get(managedGroupAlias);

    // Remove peers
    let selectedPeersToRemove;
    try {
        selectedPeersToRemove = await selectFromList(managedGroupPeerAliases, 'Select peers to remove from group.');
    } catch (e) {
        console.log(e.message);
        return;
    }
    for (const peerAlias of selectedPeersToRemove) {
        const config = await getPeerConfig(dataPath, peerAlias);
        config['hinter-cline'].groups = config['hinter-cline'].groups.filter(g => g !== managedGroupAlias);
        await updatePeerConfig(dataPath, peerAlias, config);
        console.log(`Removed '${peerAlias}' from group '${managedGroupAlias}'.`);
    }

    // Add peers
    // Note: The list of non-members is calculated based on the group's state
    // at the beginning of this function call. Peers removed in the step above
    // will not be available to be re-added in the same session.
    const peerAliases = await getPeerAliases(dataPath);
    const managedGroupNonmemberPeerAliases = peerAliases.filter(p => !managedGroupPeerAliases.includes(p));
    if (managedGroupNonmemberPeerAliases.length > 0) {
        let selectedPeersToAdd;
        try {
            selectedPeersToAdd = await selectFromList(managedGroupNonmemberPeerAliases, 'Select peers to add to group.');
        } catch (e) {
            console.log(e.message);
            return;
        }
        for (const peerAlias of selectedPeersToAdd) {
            const config = await getPeerConfig(dataPath, peerAlias);
            config['hinter-cline'] = config['hinter-cline'] || {};
            config['hinter-cline'].groups = config['hinter-cline'].groups || [];
            if (!config['hinter-cline'].groups.includes(managedGroupAlias)) {
                config['hinter-cline'].groups.push(managedGroupAlias);
            }
            await updatePeerConfig(dataPath, peerAlias, config);
            console.log(`Added '${peerAlias}' to group '${managedGroupAlias}'.`);
        }
    }
}

module.exports = {
    getGroups,
    addGroup,
    manageGroup
};
