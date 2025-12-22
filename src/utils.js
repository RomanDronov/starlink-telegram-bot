import SunCalc from 'suncalc'
import satellite from 'satellite.js'

function formatLocalTime(date, timeZone) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZoneName: 'short'
    }).format(date)
}

const MIN_AFTER_SUNSET_MS = 10 * 60 * 1000
const MIN_BEFORE_SUNRISE_MS = 30 * 60 * 1000

function getNightWindows(lat, lon, now, days) {
    const windows = []
    for (let i = 0; i < days; i += 1) {
        const d = new Date(now)
        d.setDate(d.getDate() + i)
        const w = getNightWindow(lat, lon, d)
        if (w) windows.push(w)
    }
    return windows
}

function overlapsAnyWindow(pass, windows) {
    return windows.some(w => pass.end > w.start && pass.start < w.end)
}

function getNightWindow(lat, lon, baseDate = new Date()) {
    const today = new Date(baseDate)
    today.setHours(12, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const timesToday = SunCalc.getTimes(today, lat, lon)
    const timesTomorrow = SunCalc.getTimes(tomorrow, lat, lon)

    const sunset = timesToday.sunset
    const sunrise = timesTomorrow.sunrise

    const start = new Date(sunset.getTime() + MIN_AFTER_SUNSET_MS)
    const end = new Date(sunrise.getTime() - MIN_BEFORE_SUNRISE_MS)

    return {sunset, sunrise, start, end}
}

function overlapsWindow(pass, window) {
    return pass.end > window.start && pass.start < window.end
}

function passDurationMs(pass) {
    return pass.end.getTime() - pass.start.getTime()
}

function isNotifyWorthy(pass) {
    const durMin = passDurationMs(pass) / 60000
    return durMin >= 3 && pass.maxElevationDeg >= 25
}

function scorePass(pass) {
    const durMin = passDurationMin(pass)
    const elev = pass.maxElevationDeg

    // elevation matters more than duration
    return elev * 2 + durMin * 10
}

function passDurationMin(pass) {
    return (pass.end.getTime() - pass.start.getTime()) / 60000
}

function estimateBrightness({pass, satrec}) {
    if (!isSatelliteSunlit(satrec, pass.maxTime)) {
        return 'not-visible'
    }

    const elev = pass.maxElevationDeg

    if (elev >= 70) return 'very-bright'
    if (elev >= 45) return 'bright'
    if (elev >= 25) return 'visible'
    if (elev >= 15) return 'faint'
    return 'not-visible'
}

function magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v) {
    const mag = magnitude({x: v[0], y: v[1], z: v[2]});
    return mag > 0 ? {x: v[0] / mag, y: v[1] / mag, z: v[2] / mag} : {x: 0, y: 0, z: 0};
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function isSatelliteSunlit(satrec, date) {
    const pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position) return false;

    const jday = satellite.jday(date);
    const sunPosObj = satellite.sunPos(jday);
    const sunPos = {
        x: sunPosObj.rsun[0],
        y: sunPosObj.rsun[1],
        z: sunPosObj.rsun[2],
    };
    const satPos = pv.position; // ECI, km

    const earthR = 6378.137;

    const sunDist = magnitude(sunPos);
    const sunDir = {
        x: sunPos.x / sunDist,
        y: sunPos.y / sunDist,
        z: sunPos.z / sunDist,
    };

    const s = dot(satPos, sunDir);

    if (s >= 0) {
        // In front of Earth w.r.t. Sun: always sunlit in cylindrical model
        return true;
    }

    // Behind Earth: test if inside shadow cylinder
    const satAlongAxis = {
        x: sunDir.x * s,
        y: sunDir.y * s,
        z: sunDir.z * s,
    };
    const satPerpendicular = {
        x: satPos.x - satAlongAxis.x,
        y: satPos.y - satAlongAxis.y,
        z: satPos.z - satAlongAxis.z,
    };

    const distFromAxis = magnitude(satPerpendicular);
    const inUmbra = distFromAxis <= earthR;

    return !inUmbra;
}



export {
    passDurationMin,
    scorePass,
    isNotifyWorthy,
    getNightWindow,
    overlapsWindow,
    formatLocalTime,
    isSatelliteSunlit,
    getNightWindows,
    overlapsAnyWindow,
    estimateBrightness
}
