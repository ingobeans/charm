let hourGraph = gd("hour-graph");
let hourGraphText = gd("hour-graph-text");
let commitTypeGraph = gd("commit-type-graph");
let commitTypeGraphText = gd("commit-type-graph-text");

let horizontalScale = 1.0;

function parsePx(px) {
    return parseInt(px.replace("px", ""))
}

function renderPieChart(data, colors, graphElement, graphTextElement) {
    if (graphTextElement) {
        graphTextElement.innerHTML = "";
    }
    keysSorted = Object.keys(data).sort(function (a, b) { return data[b] - data[a] });
    let total = 0;
    for (let [_, v] of Object.entries(data)) {
        total += v;
    }

    let gradientStyle = "";
    let lastPercent = undefined;
    let index = 0;
    let backupColors = ["red", "blue", "orange", "green", "yellow", "white", "lime", "fuchsia"];

    for (let k of keysSorted) {
        let percent = data[k] / total * 100;

        let element = undefined;
        if (graphTextElement) {
            element = document.createElement("label");
            element.innerText = "⬤ " + percent.toFixed(1) + "% " + k;
            graphTextElement.appendChild(element);
        }

        // find color by category (with backups since i dont want to type one for every possibly hb category)
        let color = colors[k];
        if (!color) {
            color = backupColors[index];
            index++;
        }

        // generate the pie chart css
        if (element) {
            element.style.color = color;
        }

        if (lastPercent) {
            gradientStyle += color + " " + lastPercent + "%,";
            percent += lastPercent;
        }
        lastPercent = percent;
        gradientStyle += color + " " + percent + "%,";
    }
    graphElement.style.backgroundImage = "conic-gradient(" + gradientStyle.substring(0, gradientStyle.length - 1) + ")";
}

let cachedDates = undefined;
let cachedFirstTime = undefined;
let cachedLastTime = undefined;
let cachedCodingCategories = undefined;
let cachedTimelineWidth = undefined;
let cachedTimelineHorizontalScale = undefined;
let cachedMaxDays = undefined;

let startOffset = undefined;
let endOffset = undefined;

class Graph {
    dataLines = {};
    colors = [];
    timelineWidth = 0;
    timelineHorizontalScale = 0;
    startOffset = 0;
    endOffset = 0;
    constructor(parent, colors) {
        this.yLabels = document.createElement("div");
        this.yLabels.classList.add("graph-y-labels");

        this.container = document.createElement("div");
        this.container.classList.add("graph-container");
        this.graphCanvas = document.createElement("canvas");
        this.graphCanvas.classList.add("graph-canvas");
        this.ctx = this.graphCanvas.getContext("2d");
        this.container.appendChild(this.graphCanvas);

        this.timeline = document.createElement("div");
        this.timeline.classList.add("graph-timeline");
        this.timelineCanvas = document.createElement("canvas");
        this.timelineCtx = this.timelineCanvas.getContext("2d");
        this.timelineCanvas.classList.add("timeline-canvas");
        this.timelineAreaFilled = document.createElement("div");
        this.timelineAreaFilled.classList.add("timeline-area-filled");
        this.handleStart = document.createElement("div");
        this.handleStart.classList.add("graph-timeline-handle");
        this.handleStart.classList.add("no-drag");
        this.handleStart.classList.add("handle-start");
        this.handleStart.onmousedown = handleMouseDown.bind(this, this.handleStart, true);
        this.handleEnd = document.createElement("div");
        this.handleEnd.classList.add("graph-timeline-handle");
        this.handleEnd.classList.add("no-drag");
        this.handleEnd.classList.add("handle-end");
        this.handleEnd.onmousedown = handleMouseDown.bind(this, this.handleEnd, false);
        this.timeline.appendChild(this.timelineCanvas);
        this.timeline.appendChild(this.timelineAreaFilled);
        this.timeline.appendChild(this.handleStart);
        this.timeline.appendChild(this.handleEnd);

        parent.appendChild(this.yLabels);
        parent.appendChild(this.container);
        parent.appendChild(this.timeline);

        let computed = getComputedStyle(document.documentElement);
        for (let color of colors) {
            this.colors.push(computed.getPropertyValue("--graph-" + color));
        }
    }
    iterateValues(data, first, last, callback) {
        let index = 0;
        let dateCount = 0;
        let dateAmt = 0;
        for (let k of Object.keys(data)) dateAmt++;
        while (true) {
            let date = first + 1 * index;
            let value = data[date];
            if (value != undefined) {
                dateCount++;
            }
            if (date > last) {
                break;
            }

            callback(date, value, index);
            if (dateCount >= dateAmt) {
                break;
            }
            index++;
        }
    }
    render(dataLines) {
        if (dataLines) {
            this.firstTime = undefined;
            this.lastTime = undefined;
            this.highest = [];
            this.dataLines = dataLines;

            let lineIndex = 0;
            for (let line of this.dataLines) {
                for (let [x, y] of Object.entries(line)) {
                    if (!this.firstTime || x < this.firstTime) {
                        this.firstTime = x;
                    }
                    if (!this.lastTime || x < this.lastTime) {
                        this.lastTime = x;
                    }
                    if (!this.highest[lineIndex] || y > this.highest[lineIndex]) {
                        this.highest[lineIndex] = y;
                    }
                }
                lineIndex++;
            }
        }

        const dayPadding = 1;
        let firstTime = this.firstTime - dayPadding + startOffset;
        let lastTime = this.lastTime + dayPadding - endOffset;



        let verticalScale = 0.5;

        let canvasHeight = (this.highest[0] * verticalScale) + 40;
        if (canvasHeight < 140) {
            verticalScale = (140 - 40) / this.highest[0];
            canvasHeight = 140;
        }
        let yOffset = 35;
        this.graphCanvas.height = canvasHeight;
        let horizontalPadding = 100;
        let maxX = (lastTime - firstTime);
        horizontalScale = (800 - horizontalPadding) / maxX;

        let canvasWidth = maxX * horizontalScale + horizontalPadding;
        this.graphCanvas.width = canvasWidth;
        let xOffset = 30;

        let lineIndex = 0;
        for (let line of this.dataLines) {
            this.ctx.beginPath();

            // if started is false:
            // the line wont be drawn until the first data point,
            // otherwise it will default to 0 until the first data point.
            //
            // started is set to false when the selected date selection begins
            // the same date as the first heartbeat, since then we cant guarantee
            // that the previous days with missing datapoints are 0 hours.
            let started = Math.floor(startDateInput.valueAsDate.valueOf() / 1000 / 60 / 60 / 24) != cachedFirstTime;
            this.iterateValues(line, firstTime, lastTime, (date, value) => {
                if (value && !started) {
                    started = true;
                }
                if (!value && !started) {
                    return;
                }
                let x = (date - this.firstTime) * horizontalScale + xOffset;
                let y = (value || 0) * verticalScale;
                this.ctx.lineTo(x, canvasHeight - y - yOffset);
            });
            this.ctx.strokeStyle = this.colors[lineIndex];
            this.ctx.stroke();


            this.ctx.font = "12px Verdana";
            this.ctx.fillStyle = "gray";
            let showXLabelEvery = Math.max(Math.floor(100 / horizontalScale / 1.2), 1);
            this.iterateValues(line, firstTime, lastTime, (date, value, index) => {
                if (index % showXLabelEvery != 0) {
                    return;
                }
                let x = (date - this.firstTime) * horizontalScale + xOffset;
                let dateObj = new Date(date * 24 * 60 * 60 * 1000);
                this.ctx.fillText(dateObj.getDate() + "/" + (dateObj.getMonth() + 1), x, canvasHeight);
            });
            lineIndex++;
        }

        let verticalUnitSteps = 5;

        let verticalUnitSize = this.highest[0] / verticalUnitSteps;
        let secondaryUnitSize = this.highest[1] / verticalUnitSteps;

        this.graphYLabels.innerHTML = "";
        for (let i = 0; i <= verticalUnitSteps; i++) {
            let v = verticalUnitSize * i;

            let element = document.createElement("label");
            let span = document.createElement("span");
            span.innerText = (v / 60).toFixed(1) + "h";
            element.innerText = " ";

            if (secondaryUnitSize) {
                let commitV = secondaryUnitSize * i;
                element.innerText = Math.floor(commitV);
            }

            element.style.top = (canvasHeight - v * verticalScale - yOffset - 10) + "px";
            element.appendChild(span);
            element.appendChild(document.createElement("hr"));
            this.graphYLabels.appendChild(element);
        }



        this.timelineContainer.style.width = "";
        let computedStyle = getComputedStyle(this.timelineContainer);
        let unoffsetedMaxX = (this.lastTime - this.firstTime);
        let timelineHorizontalScale = 800 / unoffsetedMaxX;

        let w = 800;
        let h = parsePx(computedStyle.height);

        w = Math.floor(w / (timelineHorizontalScale)) * (timelineHorizontalScale);
        timelineCanvas.width = w
        timelineCanvas.height = h;

        this.timelineContainer.style.width = w + "px";

        let commitToHourScaling = highest / highestCommitDays;
        let timelineVerticalScale = h / highest;
        cachedTimelineHorizontalScale = timelineHorizontalScale;

        timelineCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--timeline-border");
        this.iterateValues(dataLines, this.firstTime, this.lastTime, (date, value) => {
            if (!value) {
                return;
            }
            let x = (date - this.firstTime) * timelineHorizontalScale;

            // if day has less than 10 minutes hackatime,
            // use commit instead for activity
            if (value < 10 && Object.keys(commitDays).length > 0) {
                let commitValue = (commitDays[date] || 0) * commitToHourScaling;
                if (commitValue > value) {
                    value = commitValue;
                }
            }
            let y = (value || 0) * timelineVerticalScale;
            timelineCtx.beginPath();
            timelineCtx.fillRect(x, h - y, timelineHorizontalScale, value * verticalScale);
        });

        if (!handleStart.style.left) {
            timelineAreaFilled.style.width = w + "px";
            handleStart.style.left = "0px";
        }
        if (!handleEnd.style.left) { handleEnd.style.left = w + "px"; }

        cachedMaxDays = unoffsetedMaxX;
        cachedTimelineWidth = w;
    }
}

function renderGraph(heartbeats, projects) {
    let registeredTimes = {};
    let codingCategories = {};

    let minutesTrack = 2;
    let dates = {};
    let firstTime = undefined;
    let lastTime = 0;
    if (!heartbeats && cachedDates) {
        dates = cachedDates;
        lastTime = cachedLastTime;
        firstTime = cachedFirstTime;
        codingCategories = cachedCodingCategories;
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
            codingCategories[heartbeat.category] = (codingCategories[heartbeat.category] || 0) + minutesTrack;
            dates[dateValue] = (dates[dateValue] || 0) + minutesTrack;
        }

        cachedLastTime = lastTime;
        cachedFirstTime = firstTime;
    }
    cachedCodingCategories = codingCategories;
    hourGraphContainer.style.display = "";

    let colors = {
        "coding": "#c9f",
        "ai coding": "#f0629dff",
        "timelapsing": "#3ba5e5",
        "designing": "#6264f0",
        "writing docs": "#ffcfa3ff"
    }
    renderPieChart(codingCategories, colors, hourGraph, hourGraphText);

    graphSection.classList.remove("loading");
    graph.render([dates]);
}

let commitDays = {};
let highestCommitDays = 0;
let firstCommitDay = undefined;
let commitCount = 0;
let commitError = undefined;
let cachedCommits = undefined;
let commitTypes = {};
function parseCommits(commits) {
    commitTypeGraphContainer.style.display = "none";
    commitDays = {};
    highestCommitDays = 0;
    firstCommitDay = undefined;
    commitCount = 0;
    commitError = undefined;
    cachedCommits = commits;
    commitTypes = {};

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
        let commitType = "regular";
        if (commit.committer.login == "web-flow") {
            commitType = "web upload";
        }
        commitTypes[commitType] = (commitTypes[commitType] || 0) + 1;
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

    let colors = {
        "regular": "#62cdf6",
        "web upload": "#f6da6a"
    }
    renderPieChart(commitTypes, colors, commitTypeGraph, commitTypeGraphText);
    commitTypeGraphContainer.style.display = "";
    renderGraph();
}

// normally floors numbers, except if theyre very close to the upper digit.
// ex rounds 23.9999999999999996 -> 24
// 23.7 would still round downwards
function roundVeryClose(v) {
    return Math.floor(Math.round(v * 10) / 10)
}

let mouseX = 0;
let mouseY = 0;

// called when mouse is released anywhere
function mouseUp(event) {
    if (draggingHandle.active) {
        draggingHandle.active = false;
    }
    document.body.style.cursor = "";
}

// called when mouse is moved
function mouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;

    if (draggingHandle.active) {
        let minValue = 0;
        let maxValue = draggingHandle.graph.timelineWidth;
        let dayWidth = draggingHandle.graph.timelineHorizontalScale;

        let minDays = 2;

        if (draggingHandle.isStart) {
            maxValue = parsePx(draggingHandle.graph.handleEnd.style.left) - dayWidth * minDays;
        } else {
            minValue = parsePx(draggingHandle.graph.handleStart.style.left) + dayWidth * minDays;
        }


        let x = mouseX - draggingHandle.startX + draggingHandle.startValue;

        // clamped min value
        x = Math.max(minValue, x);

        // snap to nearest day
        x = Math.round(x / (dayWidth)) * dayWidth;

        // clamped max value (done after snapping)
        x = Math.min(maxValue, x);

        draggingHandle.element.style.left = x + "px";

        let otherPos = parsePx((draggingHandle.isStart ? draggingHandle.graph.handleEnd : draggingHandle.graph.handleStart).style.left);
        let delta = Math.abs(x - otherPos);
        draggingHandle.graph.timelineAreaFilled.style.width = delta + "px";
        draggingHandle.graph.timelineAreaFilled.style.left = draggingHandle.graph.handleStart.style.left;

        let value = roundVeryClose(parsePx(draggingHandle.element.style.left) / dayWidth);
        let oldStart = startOffset;
        let oldEnd = endOffset;
        if (draggingHandle.isStart) {
            startOffset = value;
        } else {
            value = cachedMaxDays + 1 - value;
            endOffset = value;
        }

        if (oldStart != startOffset || oldEnd != endOffset)
            renderGraph();

    }
}

let draggingHandle = {
    active: false,
    graph: undefined,
    element: undefined,
    startX: 0,
    startY: 0,
    startValue: 0,
    isStart: false,
};

// called when a timeline handle is pressed down
function handleMouseDown(element, startHandle) {
    document.body.style.cursor = "ew-resize";
    draggingHandle.active = true;
    draggingHandle.element = element;
    draggingHandle.isStart = startHandle;
    draggingHandle.startX = mouseX;
    draggingHandle.startY = mouseY;
    draggingHandle.startValue = parsePx(element.style.left);
    draggingHandle.graph = this;
}

document.body.addEventListener("mouseup", mouseUp);
document.body.addEventListener("mousemove", mouseMove);

let graph = new Graph(graphSection, ["red", "blue"]);