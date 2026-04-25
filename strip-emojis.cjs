const fs = require('fs');
const path = require('path');

// Emojis regex
const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk('c:/Projects/Gym Checkin/src').filter(f => f.endsWith('.jsx'));
let changedFiles = 0;
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const newContent = content.replace(emojiRegex, '').replace(/icon=""/g, ''); // in case we emptied an icon string
    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        changedFiles++;
    }
});

console.log(`Finished processing. Changed ${changedFiles} files.`);
