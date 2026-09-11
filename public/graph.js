let graphContainer = gd("graph-container");
let graphCanvas = gd("graph-canvas");
let ctx = graphCanvas.getContext("2d");

function countHeartbeatTimes(heartbeats, projects) {
    let dates = {};
    let registeredTimes = {};
    let minutesTrack = 2;
    let firstTime = undefined;
    let lastTime = 0;
    for (let heartbeat of heartbeats) {
        if (!projects.includes(heartbeat.project)) {
            // continue;
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
        let dateValue = date.valueOf();
        if (!firstTime || firstTime > dateValue) {
            firstTime = dateValue;
        }
        if (lastTime < dateValue) {
            lastTime = dateValue;
        }
        dates[dateValue] = (dates[dateValue] || 0) + minutesTrack;
    }
    let highest = 0;
    for (let [k, v] of Object.entries(dates)) {
        if (v > highest) {
            highest = v;
        }
    }

    console.log(dates);
    graphContainer.style.display = "";

    let horizontalScale = 1.0;
    let verticalScale = 0.5;

    let canvasHeight = (highest * verticalScale) + 40;
    let yOffset = 40;
    graphCanvas.height = canvasHeight;

    function getDateX(date) {
        return date / 1000 / 60 / 60 / 24 * 100;
    }

    function iterateDates(callback) {
        let index = 0;
        let dateAmt = count(Object.keys(dates));
        let dateCount = 0;
        while (true) {
            let date = firstTime + 1 * 24 * 60 * 60 * 1000 * index;
            let value = dates[date];
            if (value != undefined) {
                dateCount++;
            }

            callback(date, value);
            if (dateCount >= dateAmt) {
                break;
            }
            index++;
        }
    }

    let canvasWidth = getDateX(lastTime - firstTime) + 100;
    graphCanvas.width = canvasWidth;
    let xOffset = 30;

    ctx.beginPath();
    iterateDates((date, value) => {
        let x = getDateX(date - firstTime) * horizontalScale + xOffset;
        let y = (value || 0) * verticalScale;
        console.log(x, y);
        ctx.lineTo(x, canvasHeight - y - yOffset);
    });
    ctx.strokeStyle = "red";
    ctx.stroke();

    ctx.font = "12px Verdana";
    ctx.fillStyle = "gray";
    iterateDates((date, value) => {
        let x = getDateX(date - firstTime) * horizontalScale + xOffset;
        let dateObj = new Date(date);
        ctx.fillText(dateObj.getDay() + "/" + dateObj.getMonth(), x, canvasHeight);
    });

    let verticalUnitSteps = 5;

    let verticalUnitSize = highest / (verticalUnitSteps);
    console.log(highest);
    for (let i = 0; i <= verticalUnitSteps; i++) {
        let v = verticalUnitSize * i;
        console.log(v / 60);
        ctx.fillText((v / 60).toFixed(1), canvasWidth - 40, canvasHeight - v * verticalScale - yOffset);
    }
}
countHeartbeatTimes(cached.heartbeats, [cached.heartbeats[0].project]);