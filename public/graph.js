let graphSection = gd("graph-section");
let graphYLabels = gd("graph-y-labels");
let graphCanvas = gd("graph-canvas");
let ctx = graphCanvas.getContext("2d");

let horizontalScale = 1.0;

let cachedDates = undefined;
let cachedFirstTime = undefined;
let cachedLastTime = undefined;

function renderGraph(heartbeats, projects) {
    let registeredTimes = {};
    let minutesTrack = 2;
    let dates = {};
    let firstTime = undefined;
    let lastTime = 0;
    if (!heartbeats && cachedDates) {
        dates = cachedDates;
        lastTime = cachedLastTime;
        firstTime = cachedFirstTime;
    } else if (!heartbeats) {
        return;
    } else {
        dates = {};
        firstTime = undefined;
        lastTime = 0;
        for (let heartbeat of heartbeats) {
            if (projects.length != 0 && !projects.includes(heartbeat.project)) {
                continue;
            }
            let date = new Date(heartbeat.time * 1000);
            date.setMilliseconds(0);
            date.setSeconds(0);
            date.setMinutes(Math.floor(date.getMinutes() / minutesTrack) * minutesTrack);
            if (!registeredTimes[date.valueOf()]) {
                registeredTimes[date.valueOf()] = true;
            } else {
                continue;
            }

            date.setMinutes(0);
            date.setHours(0);
            let dateValue = Math.floor(heartbeat.time / 60 / 60 / 24);
            if (!firstTime || firstTime > dateValue) {
                firstTime = dateValue;
                firstTimeDate = heartbeat.time;
            }
            if (lastTime < dateValue) {
                lastTime = dateValue;
            }
            dates[dateValue] = (dates[dateValue] || 0) + minutesTrack;
        }

        cachedLastTime = lastTime;
        cachedFirstTime = firstTime;
    }
    if (firstCommitDay && firstCommitDay < firstTime) {
        firstTime = firstCommitDay;
    }

    // padding
    lastTime += 1;
    firstTime -= 1;

    cachedDates = dates;
    console.log("Finished parsing heartbeat data");
    console.log(dates);
    let dateAmt = 0;
    let highest = 0;
    for (let [k, v] of Object.entries(dates)) {
        dateAmt++;
        if (v > highest) {
            highest = v;
        }
    }

    graphSection.classList.remove("loading");

    let verticalScale = 0.5;

    let canvasHeight = (highest * verticalScale) + 40;
    if (canvasHeight < 140) {
        verticalScale = (140 - 40) / highest;
        canvasHeight = 140;
    }
    let yOffset = 35;
    graphCanvas.height = canvasHeight;

    function getDateX(date) {
        return date * 100;
    }
    function iterateDates(callback) {
        let index = 0;
        let dateCount = 0;
        while (true) {
            let date = firstTime + 1 * index;
            let value = dates[date];
            if (value != undefined) {
                dateCount++;
            }
            if (date > lastTime) {
                console.warn("Something went wrong loading dates. Soft failing");
                break;
            }

            callback(date, value, index);
            if (dateCount >= dateAmt) {
                break;
            }
            index++;
        }
    }
    let horizontalPadding = 100;
    let maxX = getDateX(lastTime - firstTime);
    horizontalScale = (800 - horizontalPadding) / maxX;

    let canvasWidth = maxX * horizontalScale + horizontalPadding;
    graphCanvas.width = canvasWidth;
    let xOffset = 30;

    ctx.beginPath();

    // if started is false:
    // the line wont be drawn until the first data point,
    // otherwise it will default to 0 until the first data point.
    //
    // started is set to false when the selected date selection begins
    // the same date as the first heartbeat, since then we cant guarantee
    // that the previous days with missing datapoints are 0 hours.
    let started = Math.floor(startDateInput.valueAsDate.valueOf() / 1000 / 60 / 60 / 24) != cachedFirstTime;
    iterateDates((date, value) => {
        if (value && !started) {
            started = true;
        }
        if (!value && !started) {
            return;
        }
        let x = getDateX(date - firstTime) * horizontalScale + xOffset;
        let y = (value || 0) * verticalScale;
        ctx.lineTo(x, canvasHeight - y - yOffset);
    });
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--graph-red");
    ctx.stroke();

    ctx.font = "12px Verdana";
    ctx.fillStyle = "gray";
    let showXLabelEvery = Math.max(Math.floor(1 / horizontalScale / 1.2), 1);
    iterateDates((date, value, index) => {
        if (index % showXLabelEvery != 0) {
            return;
        }
        let x = getDateX(date - firstTime) * horizontalScale + xOffset;
        let dateObj = new Date(date * 24 * 60 * 60 * 1000);
        ctx.fillText(dateObj.getDate() + "/" + (dateObj.getMonth() + 1), x, canvasHeight);
    });

    if (Object.keys(commitDays).length > 0) {
        ctx.beginPath();
        iterateDates((date, _) => {
            let x = getDateX(date - firstTime) * horizontalScale + xOffset;
            let value = commitDays[date] || 0;
            let maxY = highest * verticalScale;
            let y = value / highestCommitDays * maxY;
            ctx.lineTo(x, canvasHeight - y - yOffset);
        });
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--graph-blue");
        ctx.stroke();
    }

    let verticalUnitSteps = 5;

    let verticalUnitSize = highest / verticalUnitSteps;
    let commitVerticalUnitSize = highestCommitDays / verticalUnitSteps;

    graphYLabels.innerHTML = "";
    for (let i = 0; i <= verticalUnitSteps; i++) {
        let v = verticalUnitSize * i;

        let element = document.createElement("label");
        let span = document.createElement("span");
        span.innerText = (v / 60).toFixed(1) + "h";
        element.innerText = " ";

        if (commitVerticalUnitSize) {
            let commitV = commitVerticalUnitSize * i;
            element.innerText = Math.floor(commitV);
        }

        element.style.top = (canvasHeight - v * verticalScale - yOffset - 10) + "px";
        element.appendChild(span);
        element.appendChild(document.createElement("hr"));
        graphYLabels.appendChild(element);
    }
}

let commitDays = {};
let highestCommitDays = 0;
let firstCommitDay = undefined;
let commitCount = 0;
let commitError = undefined;
function parseCommits(commits) {
    commitDays = {};
    highestCommitDays = 0;
    firstCommitDay = undefined;
    commitCount = 0;
    commitError = undefined;

    for (let commit of commits) {
        if (!commit["commit"]) {
            console.log(commits);
            console.log(commit);
            if (commit["message"]) {
                commitError = commit["message"];
            } else {
                commitError = "Failed fetching repository";
            }
            return;
        }
        let date = commit.commit.author.date;
        commitCount++;
        let dateObj = new Date(date);
        let dateValue = Math.floor(dateObj.valueOf() / 1000 / 60 / 60 / 24);
        commitDays[dateValue] = (commitDays[dateValue] || 0) + 1;
        if (commitDays[dateValue] > highestCommitDays) {
            highestCommitDays = commitDays[dateValue];
        }
        if (!firstCommitDay || dateValue < firstCommitDay) {
            firstCommitDay = dateValue;
        }
    }
    renderGraph();
}