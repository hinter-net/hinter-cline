#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { rl, question } = require('./utils');
const { addPeer, managePeer } = require('./peer');
const { addGroup, manageGroup } = require('./group');
const { createDraft, postReports } = require('./report');

// --- Path and Config ---

const HINTER_CORE_DATA_PATH = path.join(__dirname, '..', 'hinter-core-data');
const PEERS_PATH = path.join(HINTER_CORE_DATA_PATH, 'peers');
const ENTRIES_PATH = path.join(HINTER_CORE_DATA_PATH, 'entries');

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
            case '1': await createDraft(PEERS_PATH, ENTRIES_PATH); break;
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
