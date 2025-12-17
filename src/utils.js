const SunCalc = require('suncalc')

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

    return { sunset, sunrise, start, end }
}

function overlapsWindow(pass, window) {
    return pass.end > window.start && pass.start < window.end
}

module.exports = {
    getNightWindow,
    overlapsWindow
}
