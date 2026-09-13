var path = require("path");
let readline = require('readline');

var absolutePath = path.resolve(__dirname, "encryption.js");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.question("do you want to generate a new encryption key? [y/n]: ", (value) => {
    if (value.toLowerCase() == "y") {
        let fs = require('node:fs');
        let crypto = require('crypto');
        let newKey = crypto.randomBytes(16).toString('hex');
        let newData = `key = "${newKey}";`;
        fs.writeFileSync(absolutePath, newData);
    }
    rl.close();
});