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
        : `${promptMessage}\nEnter a number:`;

    const choices = await question(prompt);
    if (!choices) {
        return [];
    }

    let indices;
    if (allowMultiple) {
        indices = choices.split(',').map(n => parseInt(n.trim(), 10) - 1);
    } else {
        const index = parseInt(choices.trim(), 10) - 1;
        indices = [index];
    }

    return indices
        .filter(i => !isNaN(i) && i >= 0 && i < items.length)
        .map(i => items[i]);
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
