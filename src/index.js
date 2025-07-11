#!/usr/bin/env node

const path = require("path");
const { rl, question } = require("./utils");
const { addPeer, managePeer } = require("./peer");
const { addGroup, manageGroup } = require("./group");
const { createDraft, syncReports } = require("./report");

const HINTER_CORE_DATA_PATH = path.join(__dirname, "..", "hinter-core-data");

async function cli() {
  while (true) {
    console.log(`
Hinter Helper
------------------------------
1. Create a report draft
2. Sync reports
3. Add a peer
4. Manage a peer
5. Add a group
6. Manage a group
7. Exit
------------------------------`);
    const choice = await question("Choose an option: ");

    switch (choice.trim()) {
      case "1":
        await createDraft(HINTER_CORE_DATA_PATH);
        break;
      case "2":
        await syncReports(HINTER_CORE_DATA_PATH);
        break;
      case "3":
        await addPeer(HINTER_CORE_DATA_PATH);
        break;
      case "4":
        await managePeer(HINTER_CORE_DATA_PATH);
        break;
      case "5":
        await addGroup(HINTER_CORE_DATA_PATH);
        break;
      case "6":
        await manageGroup(HINTER_CORE_DATA_PATH);
        break;
      case "7":
        console.log("Exiting.");
        rl.close();
        return;
      default:
        console.log("Invalid option.");
    }
    await question("\nPress Enter to continue...");
  }
}

if (require.main === module) {
  cli().catch((err) => {
    console.error(`\nAn unexpected error occurred: ${err.message}`);
    rl.close();
  });
}

module.exports = cli;
