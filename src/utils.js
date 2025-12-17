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

function isSatelliteSunlit(satrec, date) {
    const positionEci = satellite.propagate(
        satrec,
        date
    ).position

    if (!positionEci) return false

    const gmst = satellite.gstime(date)
    return satellite.isSunlit(positionEci, gmst)
}

module.exports = {
    isLikelyVisible, passDurationMin, scorePass, isNotifyWorthy, getNightWindow, overlapsWindow, formatLocalTime,
    estimateBrightness
}
