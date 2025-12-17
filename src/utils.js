const SunCalc = require('suncalc')

const MIN_AFTER_SUNSET_MS = 10 * 60 * 1000
const MIN_BEFORE_SUNRISE_MS = 30 * 60 * 1000

function getNightWindow(lat, lon, baseDate = new Date()) {
    // We need the "night window" that spans a sunset -> next sunrise.
    // If it's daytime, we want tonight's window.
    // If it's already night, we want the current ongoing window.

    const timesToday = SunCalc.getTimes(baseDate, lat, lon)
    const sunsetToday = timesToday.sunset
    const sunriseToday = timesToday.sunrise

    const isNightNow = baseDate < sunriseToday || baseDate > sunsetToday

    if (isNightNow) {
        // window: yesterday sunset -> today sunrise (if before sunrise)
        // or: today sunset -> tomorrow sunrise (if after sunset)
        if (baseDate < sunriseToday) {
            const yesterday = new Date(baseDate)
            yesterday.setDate(yesterday.getDate() - 1)
            const timesY = SunCalc.getTimes(yesterday, lat, lon)
            const start = new Date(timesY.sunset.getTime() + MIN_AFTER_SUNSET_MS)
            const end = new Date(sunriseToday.getTime() - MIN_BEFORE_SUNRISE_MS)
            return { start, end }
        } else {
            const tomorrow = new Date(baseDate)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const timesT = SunCalc.getTimes(tomorrow, lat, lon)
            const start = new Date(sunsetToday.getTime() + MIN_AFTER_SUNSET_MS)
            const end = new Date(timesT.sunrise.getTime() - MIN_BEFORE_SUNRISE_MS)
            return { start, end }
        }
    }

    // Daytime: use tonight (today sunset -> tomorrow sunrise)
    const tomorrow = new Date(baseDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const timesT = SunCalc.getTimes(tomorrow, lat, lon)

    const start = new Date(sunsetToday.getTime() + MIN_AFTER_SUNSET_MS)
    const end = new Date(timesT.sunrise.getTime() - MIN_BEFORE_SUNRISE_MS)
    return { start, end }
}

function overlapsWindow(pass, window) {
    return pass.end > window.start && pass.start < window.end
}

module.exports = {
    getNightWindow,
    overlapsWindow
}
