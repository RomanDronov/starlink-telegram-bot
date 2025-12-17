const SunCalc = require('suncalc')
const satellite = require('satellite.js')

function formatLocalTime(date, timeZone) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZoneName: 'short'
    }).format(date)
}

const MIN_AFTER_SUNSET_MS = 10 * 60 * 1000
const MIN_BEFORE_SUNRISE_MS = 30 * 60 * 1000

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

function isLikelyVisible(pass) {
    const durMin = passDurationMs(pass) / 60000
    return durMin >= 1 && pass.maxElevationDeg >= 20
}

function isNotifyWorthy(pass) {
    const durMin = passDurationMs(pass) / 60000
    return durMin >= 3 && pass.maxElevationDeg >= 30
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
    const sunPos = satellite.sunPos(jday);  // Returns {rsun: [x,y,z], rtasc, decl}

    const satPos = pv.position;  // ECI km
    const sunDir = normalize(sunPos.rsun);  // Unit vector toward Sun (AU, normalize to unit)

    // Earth radius ~6378.137 km (equatorial mean)
    const earthR = 6378.137;
    const satR = magnitude(satPos);  // Satellite distance from Earth center

    if (satR <= earthR) return false;  // Inside Earth

    // Angle between sat pos and sun dir
    const cosTheta = dot(satPos, sunDir) / satR;  // sunDir unit
    const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

    // Umbra cone: cos(alpha) = earthR / (earthR + ~0.27 earthR shadow length, simplified)
    const alpha = 0.27;  // Approx umbra half-angle radians
    const cosAlpha = earthR / (earthR * (1 + alpha));

    return theta <= Math.PI / 2 || theta < Math.acos(cosAlpha);  // Sunlit if not fully shadowed
}


module.exports = {
    isLikelyVisible,
    passDurationMin,
    scorePass,
    isNotifyWorthy,
    getNightWindow,
    overlapsWindow,
    formatLocalTime,
    estimateBrightness
}
