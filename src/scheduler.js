import tzLookup from 'tz-lookup'

import {getVisibleStarlinkPassesForLocation} from './starlink.js'
import {getNightWindow, formatLocalTime, passDurationMin, scorePass, getAzDeg, fmtDir} from './utils.js'
import {BRIGHTNESS_EMOJI} from './constants.js'

const MAX_TO_SHOW = 10

async function handleLocationAndListPasses(userId, chatId, lat, lon, send, days = 1) {
    const now = new Date()

    let passes
    try {
        passes = await getVisibleStarlinkPassesForLocation(lat, lon, now, 100, days)
    } catch (err) {
        console.error(err)
        await send(chatId, 'Error while computing Starlink passes. Try again later.')
        return
    }

    if (!passes.length) {
        await send(chatId, 'No visible Starlink passes predicted for the next 24 hours over this location 📭')
        return
    }

    const sorted = [...passes].sort((a, b) => scorePass(b.pass) - scorePass(a.pass))

    const subset = sorted.slice(0, MAX_TO_SHOW)

    let text = `Found ${passes.length} visible Starlink passes for the next 24 hours over your location.\n` + `Here are the first ${subset.length}:\n\n`
    const tz = tzLookup(lat, lon)
    const w = getNightWindow(lat, lon)

    text += `🌍 Timezone: ${tz}\n` + `🌅 Sunset: ${formatLocalTime(w.sunset, tz)}\n` + `🌄 Sunrise: ${formatLocalTime(w.sunrise, tz)}\n` + `🕒 Visibility window: ${formatLocalTime(w.start, tz)} → ${formatLocalTime(w.end, tz)}\n\n`

    text += `⭐ Best pass tonight:\n` + `Satellite: ${subset[0].satelliteName}\n` + `Peak: ${formatLocalTime(subset[0].pass.maxTime, tz)}\n` + `Max elevation: ${subset[0].pass.maxElevationDeg.toFixed(1)}°\n\n`

    subset.forEach((entry, idx) => {
        const {satelliteName, pass, brightness} = entry

        const start = formatLocalTime(pass.start, tz)
        const end = formatLocalTime(pass.end, tz)
        const peak = formatLocalTime(pass.maxTime, tz)

        const startAz = getAzDeg(entry.satrec, pass.start, lat, lon)
        const peakAz = getAzDeg(entry.satrec, pass.maxTime, lat, lon)
        const endAz = getAzDeg(entry.satrec, pass.end, lat, lon)

        text += `🛰️ ${idx + 1}\n` + `Satellite: ${satelliteName}\n` + `Start: ${start}\n` + `End:   ${end}\n` + `Peak:  ${peak}\n` + `Duration: ${passDurationMin(pass).toFixed(1)} min\n` + `Max elevation: ${pass.maxElevationDeg.toFixed(1)}°\n`
        text += `Brightness: ${BRIGHTNESS_EMOJI[brightness]} ${brightness}\n`
        text +=
            `Direction 🧭:\n` +
            `  Start: ${fmtDir(startAz)}\n` +
            `  Peak:  ${fmtDir(peakAz)}\n` +
            `  End:   ${fmtDir(endAz)}\n\n`
    })

    await send(chatId, text)

    // const first = subset[0]
    //  await scheduleNotificationForPass(userId, chatId, first)
}

export {
    handleLocationAndListPasses
}
