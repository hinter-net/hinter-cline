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

function isValidSlug(slug) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function isValidPublicKey(key) {
    return /^[a-f0-9]{64}$/.test(key);
}

function slugify(text) {
    return text
        .replaceAll(/[^\d\sA-Za-z]+/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim()
        .split(' ')
        .join('-')
        .toLowerCase();
}

function displayList(items) {
    let output = '';
    items.forEach((item, index) => {
        output += `[${index + 1}]`.padEnd(5) + `${item.padEnd(20)}`;
        if ((index + 1) % 4 === 0) {
            output += '\n';
        }
    });
    console.log(output);
}

async function selectFromList(items, promptMessage, { allowMultiple = true } = {}) {
    if (items.length === 0) {
        return [];
    }
    displayList(items);

    const prompt = allowMultiple
        ? `${promptMessage}\nEnter comma-separated numbers (e.g. 3,5,6): `
        : `${promptMessage}\nEnter a number: `;

    const choices = await question(prompt);
    if (!choices) {
        return [];
    }

    const selectedItems = [];

    if (allowMultiple) {
        const choiceStrings = choices.split(',');
        for (const str of choiceStrings) {
            const trimmed = str.trim();
            if (trimmed === '') continue;

            const index = parseInt(trimmed, 10) - 1;
            if (isNaN(index) || index < 0 || index >= items.length) {
                throw new Error(`Invalid selection: '${trimmed}'. Please enter numbers from the list.`);
            }
            selectedItems.push(items[index]);
        }
    } else {
        const trimmed = choices.trim();
        if (trimmed.includes(',')) {
            throw new Error('Multiple selections are not allowed for this prompt.');
        }
        const index = parseInt(trimmed, 10) - 1;
        if (isNaN(index) || index < 0 || index >= items.length) {
            throw new Error(`Invalid selection: '${trimmed}'. Please enter numbers from the list.`);
        }
        selectedItems.push(items[index]);
    }

    return selectedItems;
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

async function* walk(dir) {
    for await (const d of await fs.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* walk(entry);
        else if (d.isFile()) yield entry;
    }
}

async function removeEmptyDirectories(directory) {
    const fileStats = await fs.readdir(directory);
    await Promise.all(fileStats.map(async (file) => {
        const fullPath = path.join(directory, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await removeEmptyDirectories(fullPath);
            const files = await fs.readdir(fullPath);
            if (files.length === 0) {
                await fs.rmdir(fullPath);
            }
        }
    }));
}

module.exports = {
    rl,
    question,
    isValidSlug,
    isValidPublicKey,
    slugify,
    displayList,
    selectFromList,
    extractFrontmatterAndContent,
    walk,
    removeEmptyDirectories
};
