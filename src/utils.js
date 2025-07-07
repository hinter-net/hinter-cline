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

function displayPeers(peers) {
    let output = '';
    peers.forEach((peer, index) => {
        output += `[${index + 1}]`.padEnd(5) + `${peer.padEnd(20)}`;
        if ((index + 1) % 4 === 0) {
            output += '\n';
        }
    });
    console.log(output);
}

module.exports = {
    rl,
    question,
    isValidSlug,
    isValidPublicKey,
    slugify,
    displayPeers
};
