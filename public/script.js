function gd(id) { return document.getElementById(id); }

let errorSvg = `<svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 512a256 256 0 1 1 0-512 256 256 0 1 1 0 512zm0-192a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.6 11.4 22.3 23.9 22.3 12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z"/></svg>`;

let tokenInput = gd("token-input");
let tokenInputError = gd("token-input-error");
let startDateInput = gd("start-date-input");
let endDateInput = gd("end-date-input");
let projectSelectContainer = gd("project-select");
let viewBtn = gd("view-btn");

function count(query) {
    let i = 0;
    for (let _ of query) {
        i++;
    }
    return i;
}

function clickProject(element) {
    if (element.classList.contains("selected-project")) {
        element.classList.remove("selected-project");
    } else {
        element.classList.add("selected-project");
    }
    let amt = count(document.querySelectorAll(".selected-project"));
    if (amt > 0) {
        if (viewBtn.hasAttribute("disabled")) {
            viewBtn.removeAttribute("disabled");
        }
    } else {
        if (!viewBtn.hasAttribute("disabled")) {
            viewBtn.setAttribute("disabled", "");
        }
    }
}

tokenInput.addEventListener("input", () => {
    let value = tokenInput.value;
    if (value == "") {
        tokenInputError.innerHTML = "";
        return;
    } else if (value.length != 43) {
        tokenInputError.innerHTML = errorSvg + "Invalid Hackatime token.";
        return;
    }
    tokenInputError.innerHTML = "";
    fetch(`/projects?token=${tokenInput.value}&start=${startDateInput.value}&end=${endDateInput.value}`).then((res) => {
        res.text().then((value => {
            console.log(value);
            let data = JSON.parse(value);
            if (data["error"]) {
                projectSelectContainer.innerHTML = `<p class="error">${errorSvg}Error fetching Hackatime projects: ${data["error"]}.</p>`;
                return;
            }
            projectSelectContainer.innerHTML = "";
            for (let project of data["projects"]) {
                let entry = document.createElement("div");
                entry.setAttribute("project", project.name);
                let name = document.createElement("span");
                let hours = document.createElement("span");
                hours.className = "hour-count";
                name.innerText = project.name;
                hours.innerText = (project.total_seconds / 60 / 60).toFixed(1);
                entry.appendChild(name);
                entry.appendChild(hours);
                entry.onclick = clickProject.bind(null, entry);
                projectSelectContainer.appendChild(entry);
            }
        }))
    })
});