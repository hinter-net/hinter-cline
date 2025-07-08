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
    console.log('\n--- Add a Group ---');
    const newGroupAlias = await question('Enter new group alias (e.g., ai-developers): ');
    if (!isValidSlug(newGroupAlias)) {
        console.log('Invalid alias format. Use lowercase letters, numbers, and single hyphens.');
        return;
    }

    const groups = await getGroups(dataPath);
    if (groups.has(newGroupAlias)) {
        console.log('Error: A group with this alias already exists.');
        return;
    }

    const peerAliases = await getPeerAliases(dataPath);
    if (peerAliases.length === 0) {
        console.log('No peers exist to add to a group.');
        return;
    }

    const selectedItems = await selectFromList(peerAliases, 'Select peers to add');
    if (selectedItems.length === 0) {
        console.log('No peer selected. Group not added.');
        return;
    }
    for (const peerAlias of selectedItems) {
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
    console.log('\n--- Manage a Group ---');
    const groups = await getGroups(dataPath);
    if (groups.size === 0) {
        console.log('No groups to manage.');
        return;
    }

    const groupAliases = Array.from(groups.keys());
    const selectedItems = await selectFromList(groupAliases, 'Select a group to manage', { allowMultiple: false });
    if (selectedItems.length === 0) {
        console.log('No group selected.');
        return;
    }
    const managedGroupAlias = selectedItems[0];
    const managedGroupPeerAliases = groups.get(managedGroupAlias);
    console.log(`\nPeers in '${managedGroupAlias}':`);
    displayList(managedGroupPeerAliases);

    // Remove peers
    const peersToRemove = await selectFromList(managedGroupPeerAliases, 'Select peers to remove from group');
    for (const peerAlias of peersToRemove) {
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
        console.log('\nPeers not in this group:');
        const peersToAdd = await selectFromList(managedGroupNonmemberPeerAliases, 'Select peers to add to group');
        for (const peerAlias of peersToAdd) {
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
