const express = require('express');
var path = require('path');
try {
    require("./config.js");
} catch {
    oauthUid = undefined;
}

root = "";

const app = express();
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/public');

app.get('/', function (req, res) {
    root = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.render("index")
});

app.get('/callback', async (req, res) => {
    root = req.protocol + '://' + req.get('host') + req.originalUrl;
    let code = req.query["code"];
    console.log(code);
    let r = await fetch("https://hackatime.hackclub.com/oauth/token", {
        method: "POST",
        body: new URLSearchParams({
            client_id: oauthUid,
            client_secret: oauthSecret,
            code: code,
            redirect_uri: root + "callback",
            grant_type: "authorization_code",
        })
    });
    let data = await r.json();
    let token = data["access_token"];
    res.cookie('token', token);
    console.log(data);
    res.redirect("/?a=1")
});

let allowedFiles = ["style.css", "script.js", "placeholder.png"];
for (let file of allowedFiles) {
    app.get('/' + file, function (req, res) {
        res.sendFile(path.join(__dirname + '/public/' + file));
    });
}

app.get("/user", async (req, res) => {
    let reqData = {
        credentials: "include",
        headers: {
            "Authorization": "Bearer " + req.query["token"],
        }
    };
    data = {}

    // also try fetch user info
    r = await fetch("https://hackatime.hackclub.com/api/v1/authenticated/me", reqData);
    if (r.ok) {
        let userData = await r.json();
        data["slack_id"] = userData["slack_id"];
        data["github_username"] = userData["github_username"];
        if (data["slack_id"]) {
            let r = await fetch("https://cachet.dunkirk.sh/users/" + data["slack_id"]);
            if (r.ok) {
                let slackData = await r.json();
                data["username"] = slackData["displayName"];
                data["pfp"] = slackData["imageUrl"];
            }
        }
    }
    res.send(data);
});
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
    res.send(data);
});

app.listen(port, () => {
    console.log(`running @ http://localhost:${port}`);
}); 