let graphContainer = gd("graph-container");

function countHeartbeatTimes(heartbeats, projects) {
    let datapoints = [];
    let dates = {};
    let registeredTimes = {};
    let minutesTrack = 2;
    let firstTime = undefined;
    for (let heartbeat of heartbeats) {
        if (!projects.includes(heartbeat.project)) {
            // continue;
        }
        if (!firstTime || firstTime > heartbeat.time) {
            firstTime = heartbeat.time;
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
        dates[date.valueOf()] = (dates[date.valueOf()] || 0) + minutesTrack;
    }
    console.log(dates);
}
// countHeartbeatTimes(cached.heartbeats, [cached.heartbeats[0].project]);