const express = require('express');
var path = require('path');
const app = express();
const port = 8080;

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

let allowedFiles = ["style.css", "script.js", "placeholder.png"];
for (let file of allowedFiles) {
    app.get('/' + file, function (req, res) {
        res.sendFile(path.join(__dirname + '/public/' + file));
    });
}

app.get("/projects", async (req, res) => {
    let allowedDateChars = "0123456789-";

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
    let reqData = {
        credentials: "include",
        headers: {
            "Authorization": "Bearer " + req.query["token"],
        }
    };

    url = `https://hackatime.hackclub.com/api/v1/authenticated/projects?start_date=${req.query["start"]}&end_date=${req.query["end"]}`

    let r = await fetch(url, reqData);
    let data = await r.json();

    // also try fetch user info
    r = await fetch("https://hackatime.hackclub.com/api/v1/authenticated/me", reqData);
    if (r.ok) {
        let userData = await r.json();
        data["slack_id"] = userData["slack_id"];
    }

    res.send(data);
});

app.listen(port, () => {
    console.log(`running @ http://localhost:${port}`);
}); 