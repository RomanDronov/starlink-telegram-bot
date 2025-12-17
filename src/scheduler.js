const tzLookup = require('tz-lookup')

const {getVisibleStarlinkPassesForLocation} = require('./starlink')
const {getNightWindow, formatLocalTime} = require('./utils')

async function handleLocationAndListPasses(userId, chatId, lat, lon, send) {
    const now = new Date()

    let passes
    try {
        passes = await getVisibleStarlinkPassesForLocation(lat, lon, now, 100)
    } catch (err) {
        console.error(err)
        await send(chatId, 'Error while computing Starlink passes. Try again later.')
        return
    }

    if (!passes.length) {
        await send(chatId, 'No visible Starlink passes predicted for the next 24 hours over this location 📭')
        return
    }

    // limit how much we spam – e.g. show first 10 passes
    const maxToShow = 10
    const subset = passes.slice(0, maxToShow)

    let text = `Found ${passes.length} visible Starlink passes for the next 24 hours over your location.\n` + `Here are the first ${subset.length}:\n\n`
    const tz = tzLookup(lat, lon)
    const w = getNightWindow(lat, lon)

    text += `🌍 Timezone: ${tz}\n` + `🌅 Sunset: ${formatLocalTime(w.sunset, tz)}\n` + `🌄 Sunrise: ${formatLocalTime(w.sunrise, tz)}\n` + `🕒 Visibility window: ${formatLocalTime(w.start, tz)} → ${formatLocalTime(w.end, tz)}\n\n`

    subset.forEach((entry, idx) => {
        const {satelliteName, pass} = entry
        const start = pass.start.toISOString()
        const end = pass.end.toISOString()
        const peak = pass.maxTime.toISOString()
        text += `#${idx + 1}\n` + `Satellite: ${satelliteName}\n` + `Start (UTC): ${start}\n` + `End   (UTC): ${end}\n` + `Peak  (UTC): ${peak}\n` + `Max elevation: ${pass.maxElevationDeg.toFixed(1)}°\n\n`
    })

    text += '_Times shown in UTC. Visibility is approximate (ignores clouds and, currently, satellite shadow)._'

    await send(chatId, text)

    // const first = subset[0]
    //  await scheduleNotificationForPass(userId, chatId, first)
}

module.exports = {
    handleLocationAndListPasses
}
