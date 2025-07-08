const readline = require('readline');

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
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
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

    const choiceStrings = allowMultiple ? choices.split(',') : [choices];
    const selectedItems = [];

    for (const str of choiceStrings) {
        const trimmed = str.trim();
        if (trimmed === '') continue;

        const index = parseInt(trimmed, 10) - 1;
        if (isNaN(index) || index < 0 || index >= items.length) {
            throw new Error(`Invalid selection: '${trimmed}'. Please enter numbers from the list.`);
        }
        selectedItems.push(items[index]);
    }

    if (!allowMultiple && selectedItems.length > 1) {
        throw new Error('Multiple selections are not allowed for this prompt.');
    }

    return selectedItems;
}

module.exports = {
    rl,
    question,
    isValidSlug,
    isValidPublicKey,
    slugify,
    displayList,
    selectFromList
};
