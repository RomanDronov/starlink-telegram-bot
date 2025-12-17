require('dotenv').config()

console.log('TOKEN loaded:', !!process.env.TELEGRAM_BOT_TOKEN)

const config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    starlinkTleUrl:
        process.env.STARLINK_TLE_URL ||
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
    // visibility thresholds
    minElevationDeg: 20,          // minimum elevation to consider a pass
    maxLookAheadHours: 24,        // prediction window for demo
    timeStepSeconds: 60,          // coarse step for scanning passes
    sunAltThresholdDeg: -6        // civil twilight; tweak as you like
}

if (!config.telegramToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set')
}

module.exports = config
