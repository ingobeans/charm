const express = require('express');
var path = require('path');
const app = express();
const port = 8080;

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

let allowedFiles = ["style.css", "script.js"];
for (let file of allowedFiles) {
    app.get('/' + file, function (req, res) {
        res.sendFile(path.join(__dirname + '/public/' + file));
    });
}

app.listen(port, () => {
    console.log(`running @ http://localhost:${port}`);
}); 