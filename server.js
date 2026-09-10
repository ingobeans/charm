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

app.get("/projects", function (req, res) {
    let allowedDateChars = "0123456789-";

    console.log(req.query);
    let start = req.query["start"];
    if (start == undefined || start.length == 0) {
        res.send({ error: `Missing start date` });
        return;
    }

    for (let field of ["start", "end"]) {
        if (req.query[field] == undefined) {
            continue;
        }
        for (let char of req.query[field]) {
            if (!allowedDateChars.includes(char)) {
                res.send({ error: `Bad ${field} date` });
                return;
            }
        }
    }
    url = `https://hackatime.hackclub.com/api/v1/authenticated/projects?start_date=${req.query["start"]}&end_date=${req.query["end"]}`
    fetch(url, {
        credentials: "include",
        headers: {
            "Authorization": "Bearer " + req.query["token"],
        }
    }).then((r) => {
        r.text().then((data) => {
            res.send(data);
        })
    })
});

app.listen(port, () => {
    console.log(`running @ http://localhost:${port}`);
}); 