const { getNextVisibleStarlinkPass } = require('./starlink')
const config = require('./config')

/**
 * Map: userId -> { timeoutId, passInfo }
 */
const userSchedules = new Map()

/**
 * Schedule a notification for the next visible pass.
 * `sendFn` is a function (chatId, text) => void
 */
async function scheduleNextPassForUser(userId, chatId, lat, lon, sendFn) {
    const existing = userSchedules.get(userId)
    if (existing?.timeoutId) {
        clearTimeout(existing.timeoutId)
    }

    const now = new Date()
    const result = await getNextVisibleStarlinkPass(lat, lon, now)

    if (!result) {
        sendFn(chatId, 'No visible Starlink pass predicted in the next 24 hours 📭')
        userSchedules.delete(userId)
        return
    }

    const { satelliteName, pass } = result
    const { maxTime, maxElevationDeg } = pass

    const notifyTime = new Date(maxTime.getTime() - 30 * 60 * 1000) // -30 min

    if (notifyTime <= now) {
        sendFn(
            chatId,
            `Starlink pass very soon!\nSatellite: ${satelliteName}\nMax elevation: ${maxElevationDeg.toFixed(
                1
            )}° at ${maxTime.toISOString()}`
        )
        userSchedules.delete(userId)
        return
    }

    const delayMs = notifyTime.getTime() - now.getTime()

    const timeoutId = setTimeout(() => {
        const msg =
            `Starlink pass in ~30 minutes 🚀\n\n` +
            `Satellite: ${satelliteName}\n` +
            `Max elevation: ${maxElevationDeg.toFixed(1)}°\n` +
            `Peak time (UTC): ${maxTime.toISOString()}`
        sendFn(chatId, msg)

        userSchedules.delete(userId)
    }, delayMs)

    userSchedules.set(userId, {
        timeoutId,
        passInfo: { satelliteName, pass }
    })

    sendFn(
        chatId,
        `Got your location. Next *predicted visible* Starlink pass:\n\n` +
        `Satellite: ${satelliteName}\n` +
        `Max elevation: ${maxElevationDeg.toFixed(1)}°\n` +
        `Peak time (UTC): ${maxTime.toISOString()}\n\n` +
        `I'll ping you 30 minutes before.`
    )
}

module.exports = {
    scheduleNextPassForUser
}
