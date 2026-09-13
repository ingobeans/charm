function gd(id) { return document.getElementById(id); }

let errorSvg = `<svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 512a256 256 0 1 1 0-512 256 256 0 1 1 0 512zm0-192a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.6 11.4 22.3 23.9 22.3 12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z"/></svg>`;

let tokenInput = gd("token-input");
let tokenInputError = gd("token-input-error");
let startDateInput = gd("start-date-input");
let startDateInputError = gd("start-date-input-error");
let endDateInput = gd("end-date-input");
let projectSelectContainer = gd("project-select");
let viewBtn = gd("view-btn");
let authorName = gd("author-name");
let authorPfp = gd("author-pfp");
let authorSlackId = gd("author-slackid");
let authorGithub = gd("author-github");
let authorContainer = gd("author-container");
let authorLoader = gd("author-loader");
let oauthButton = gd("oauth-button");
let repoInput = gd("repo-input");
let repoContainer = gd("repo-container");
let repoLoader = gd("repo-loader");
let repoName = gd("repo-name");
let repoCommits = gd("repo-commits");
let repoLink = gd("repo-link");
let repoError = gd("repo-error");
let graphSection = gd("graph-section");

let cachedProjectsData = undefined;

let fetchedGithubRepo = "";

function count(query) {
    let i = 0;
    for (let _ of query) {
        i++;
    }
    return i;
}

async function fetchRepo(url) {
    if (url == fetchedGithubRepo)
        return;
    let result = validateUrl(url);
    if (!result["owner"]) {
        return;
    }

    fetchedGithubRepo = url;

    repoContainer.style.display = "";
    repoContainer.classList.add("loading");
    console.log("fetching repo");

    apiUrl = "/repo?url=" + url;
    let r = await fetch(apiUrl);
    let b = await r.json();
    await parseCommits(b);
    if (commitError) {
        repoName.innerText = "";
        repoCommits.innerText = "";
        repoError.innerHTML = errorSvg + commitError;
    } else {
        repoError.innerHTML = "";
        repoName.innerText = result.name;
        repoCommits.innerText = commitCount + " commits";
    }
    repoLink.href = url;
    repoLink.innerText = "View";
    repoContainer.classList.remove("loading");
}

function repoInputChange() {
    setTimeout(((v) => {
        if (v == repoInput.value) {
            fetchRepoInput();
        }
    }).bind(null, repoInput.value)
        , 1000);
}

function fetchRepoInput() {
    console.log("wa");
    let result = validateUrl(repoInput.value);
    if (result["owner"]) {
        fetchRepo(repoInput.value);
    } else {
        // console.warn(result);
    }
}

repoInput.addEventListener("input", repoInputChange);
repoInput.addEventListener("focusout", fetchRepoInput);

async function oauthButtonClick() {
    let token = await cookieStore.get("token");
    if (token) {
        oauthButton.setAttribute("disabled", "");
        tokenInput.value = token.value;
        fetchProjects();
        fetchAuthorData();
    } else {
        window.location.href = oauthButton.getAttribute("href");
    }
}

function clickProject(element) {
    if (element.classList.contains("selected-project")) {
        element.classList.remove("selected-project");
        projects.splice(projects.indexOf(element.getAttribute("project")), 1);
    } else {
        element.classList.add("selected-project");
        projects.push(element.getAttribute("project"));
    }
}

function inputChange() {
    if (!startDateInput.value) {
        startDateInputError.innerHTML = errorSvg + "Required.";
    } else {
        startDateInputError.innerHTML = "";
    }
}

for (let input of document.querySelectorAll("input")) {
    input.addEventListener("input", inputChange);
}

function handleAuthorDataReq(res) {
    res.text().then((value => {
        let data = JSON.parse(value);
        console.log(data);
        authorContainer.classList.remove("loading");
        authorSlackId.innerText = data["slack_id"] || "";
        authorGithub.innerText = data["github_username"] || "";
        authorGithub.href = (data["github_username"]) ? ("https://github.com/" + data["github_username"]) : "";
        authorGithub.style.visibility = (data["github_username"]) ? "visible" : "hidden";
        authorPfp.src = data["pfp"] || "/placeholder.png";
        if (data["username"]) {
            authorName.innerText = data["username"];
        } else {
            authorName.innerHTML = "[unknown]<div class='info-mark'>?<div>The OAuth App that issued the selected token doesn't have the profile scope</div></div>";
        }
    }))
}

function startLoadingAuthor() {
    authorName.innerHTML = "";
    authorSlackId.innerText = "";
    authorGithub.innerText = "";
    authorGithub.style.visibility = "hidden";
    authorContainer.style.display = "";
    authorContainer.classList.add("loading");
}

function fetchAuthorData() {
    startLoadingAuthor();

    let value = tokenInput.value;
    if (value == "") {
        authorContainer.style.display = "none";
        return;
    } else if (value.length != 43) {
        authorContainer.style.display = "none";
        return;
    }
    fetch(`/user?token=${value}`).then(handleAuthorDataReq)
}

function handleViewProjectsReq(res) {
    res.text().then((value => {
        let data = JSON.parse(value);
        cachedProjectsData = data;
        renderGraph(data.heartbeats, projects);
    }))
}

function startLoadingGraph() {
    graphSection.classList.add("loading");
    graphSection.style.display = "";
}

function viewProjects() {
    startLoadingGraph();

    if (cachedProjectsData) {
        renderGraph(cachedProjectsData.heartbeats, projects);
        return;
    }

    fetch(`/data?token=${tokenInput.value}&start=${startDateInput.value}&end=${endDateInput.value}`).then(handleViewProjectsReq);
}

function handleFetchProjectsReq(res) {
    oldProjects = projects;
    projects = [];
    res.text().then((value => {
        let data = JSON.parse(value);
        console.log(data);
        if (data["error"]) {
            projectSelectContainer.innerHTML = `<p class="error">${errorSvg}Error fetching Hackatime projects: ${data["error"]}.</p>`;
            return;
        }
        projectSelectContainer.innerHTML = "";
        viewBtn.removeAttribute("disabled");
        for (let project of data["projects"]) {
            let entry = document.createElement("div");
            entry.setAttribute("project", project.name);
            if (oldProjects.includes(project.name)) {
                projects.push(project.name);
                entry.classList.add("selected-project");
            }
            let name = document.createElement("span");
            let hours = document.createElement("span");
            hours.classList.add("hour-count");
            name.innerText = project.name;
            hours.innerText = (project.total_seconds / 60 / 60).toFixed(1);
            entry.appendChild(name);
            entry.appendChild(hours);
            entry.onclick = clickProject.bind(null, entry);
            projectSelectContainer.appendChild(entry);
        }
    }))
}

function fetchProjects() {
    let value = tokenInput.value;
    if (value == "") {
        tokenInputError.innerHTML = "";
        return;
    } else if (value.length != 43) {
        console.log(value.length);
        tokenInputError.innerHTML = errorSvg + "Invalid Hackatime token.";
        return;
    } else if (!startDateInput.value) {
        tokenInputError.innerHTML = "";
        return;
    }
    tokenInputError.innerHTML = "";
    fetch(`/projects?token=${tokenInput.value}&start=${startDateInput.value}&end=${endDateInput.value}`).then(handleFetchProjectsReq);
}

startDateInput.addEventListener("input", () => { fetchProjects(); cachedProjectsData = undefined; });
endDateInput.addEventListener("input", () => { fetchProjects(); cachedProjectsData = undefined; });
tokenInput.addEventListener("input", () => {
    fetchProjects();
    fetchAuthorData();
    if (oauthButton) oauthButton.removeAttribute("disabled");
});

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("s")) {
    let session = urlParams.get("s");
    startLoadingAuthor();
    fetch(`/user?s=${session}`).then(handleAuthorDataReq);
    fetch(`/projects?s=${session}`).then(handleFetchProjectsReq);
    startLoadingGraph();
    console.log("wa");
    fetch(`/data?s=${session}`).then(handleViewProjectsReq);
}
else if (urlParams.get('a') == "1") {
    cookieStore.get("token").then((v) => {
        if (v) {
            oauthButtonClick();
            inputChange();
        }
    })
}

let darkmodeButton = document.getElementById("darkmode-switch");
darkmodeButton.addEventListener("click", (event) => {
    light = !light;
    localStorage.setItem("light", light.toString());
    if (light) {
        document.documentElement.classList.add('light-root')
    } else {
        document.documentElement.classList.remove('light-root')
    }
})
