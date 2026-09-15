let express = require('express');
let fs = require('fs');
let path = require('path');
let crypto = require('crypto');

require("./public/shared.js");
require("./encryption.js");

try {
    require("./config.js");
} catch {
    oauthUid = undefined;
    githubToken = undefined;
}

root = "";

const app = express();
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/public');

let allowedFiles = fs.readdirSync('./public');
for (let file of allowedFiles) {
    if (file.endsWith(".ejs")) {
        continue;
    }
    app.get('/' + file, function (req, res) {
        res.sendFile(path.join(__dirname + '/public/' + file));
    });
}

let algorithm = "aes256";
function encryptSession(text) {
    let iv = crypto.randomBytes(8).toString('hex');
    let cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
    return encrypted.replaceAll("+", "_") + iv;
}
function decryptSession(entry) {
    let iv = entry.slice(-16);
    let encrypted = entry.slice(0, -16).replaceAll("_", "+");
    let decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8');
    return decrypted;
}

app.get('/', function (req, res) {
    let projects = [];
    let prefill = {};
    if (req.query["s"]) {
        try {
            let decrypted = decryptSession(req.query["s"]);
            let data = JSON.parse(decrypted);
            if (data["projects"] && typeof data["projects"] == "object" && data["projects"].length) {
                projects = data["projects"];
            }
            for (let key of ["start", "end", "repo"]) {
                if (data[key] && typeof data[key] == "string") {
                    prefill[key] = data[key];
                }
            }
            console.log(data);
        } catch {
            res.redirect("/");
            return;
        }
    }
    root = req.protocol + '://' + req.get('host') + "/";
    res.render("index", { projects: projects, prefill: prefill })
});

// todo: replace with POST and json body, for csrf reasons perhaps? slight code smell
app.get('/create_session', function (req, res) {
    let sessionText = req.query["s"];
    if (!sessionText) {
        res.send({ error: "Missing `s` query parameter." });
        return;
    }
    let session;
    try {
        session = JSON.parse(sessionText);
    } catch (error) {
        res.send({ error: "Couldn't parse session as JSON. Error: " + error });
        return;
    }
    let allowedKeys = ["token", "start", "end", "repo", "projects"];
    let requiredKeys = ["token", "start"];
    for (let [k, v] of Object.entries(session)) {
        if (!allowedKeys.includes(k)) {
            res.send({ error: "Unallowed key: " + k });
            return;
        }
        let i = requiredKeys.indexOf(k);
        if (i != -1) {
            requiredKeys.splice(i, 1);
        }
    }
    if (requiredKeys.length > 0) {
        res.send({ error: "Missing required key(s): " + requiredKeys });
        return;
    }

    let encrypted = encryptSession(JSON.stringify(session));
    root = req.protocol + '://' + req.get('host') + "/";
    res.send({ session: encrypted, link: root + "?s=" + encrypted });
    return;
});

app.get('/callback', async (req, res) => {
    root = req.protocol + '://' + req.get('host') + "/";
    let code = req.query["code"];
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
    res.cookie('token', token, { expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) });
    res.redirect("/?a=1")
});

app.get('/repo', async (req, res) => {
    let url = req.query["url"];
    let result = validateUrl(url);
    if (!result["owner"]) {
        res.send({ error: result });
        return;
    }

    let commits = [];

    let apiUrl = `https://api.github.com/repos/${result.owner}/${result.name}/commits?per_page=100`;
    let headers = {
        "Accept": "application/json",
        "X-GitHub-Api-Version": "2026-03-10",
    };
    if (githubToken) {
        headers["Authorization"] = "Bearer " + githubToken;
    }
    let apiRes = await fetch(apiUrl, { headers: headers });


    // loop because api is paginated,
    // so sometimes more requests are needed
    // to read all pages of data
    for (let i = 0; i < 15; i++) {
        let body = await apiRes.json();
        commits = commits.concat(body);

        // response contains a "link" header,
        // if there are more pages to be read.
        // link points to a new api url where the
        // next page of data can be fetched
        let link = apiRes.headers.get("link");
        if (link) {
            let entry = link.split(",")[0];
            // check that the link actually points to the next page
            // of data, rather than the first.
            if (!entry.includes('rel="next"')) { break; }
            apiUrl = link.split(";")[0].replace("<", "").replace(">", "");
            apiRes = await fetch(apiUrl, { headers: headers });
        } else {
            break;
        }
    }
    res.send(commits);
});

function decodeSession(req) {
    let s = req.query["s"];

    if (s) {
        try {
            let decrypted = decryptSession(s);
            let data = JSON.parse(decrypted);
            let query = {}
            for (let [k, v] of Object.entries(data)) {
                query[k] = v;
            }
            return query;
        } catch (error) {
            // console.warn(error)
        }
    }
    return req.query;
}

app.get("/user", async (req, res) => {
    let query = decodeSession(req);
    let token = query["token"];

    let reqData = {
        credentials: "include",
        headers: {
            "Authorization": "Bearer " + token,
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

function validateDates(query) {
    let allowedDateChars = "0123456789-";

    let start = query["start"];
    if (start == undefined || start.length == 0) {
        return `Missing start date`;
    }

    for (let field of ["start", "end"]) {
        if (query[field] == undefined) {
            continue;
        }
        for (let char of query[field]) {
            if (!allowedDateChars.includes(char)) {
                return `Bad ${field} date`;
            }
        }
    }
}

app.get("/data", async (req, res) => {
    let query = decodeSession(req);
    let datesError = validateDates(query);
    if (datesError) {
        res.send({ error: datesError });
        return;
    }
    let reqData = {
        credentials: "include",
        headers: {
            "Authorization": "Bearer " + query["token"],
        }
    };

    url = `https://hackatime.hackclub.com/api/v1/my/heartbeats?start_time=${query["start"]}&end_time=${query["end"] || ""}`;

    let r = await fetch(url, reqData);
    let data = await r.json();
    res.send(data);
});

app.get("/projects", async (req, res) => {
    let query = decodeSession(req);
    let datesError = validateDates(query);
    if (datesError) {
        res.send({ error: datesError });
        return;
    }
    let reqData = {
        credentials: "include",
        headers: {
            "Authorization": "Bearer " + query["token"],
        }
    };

    url = `https://hackatime.hackclub.com/api/v1/authenticated/projects?start_date=${query["start"]}&end_date=${query["end"] || ""}`

    let r = await fetch(url, reqData);
    let data = await r.json();
    res.send(data);
});

app.listen(port, () => {
    console.log(`running @ http://localhost:${port}`);
}); 