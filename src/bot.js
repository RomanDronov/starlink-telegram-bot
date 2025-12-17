const TelegramBot = require('node-telegram-bot-api')
const config = require('./config')
const { scheduleNextPassForUser } = require('./scheduler')

const bot = new TelegramBot(config.telegramToken, { polling: true })

// In-memory user settings { [userId]: { lat, lon } }
const userLocations = new Map()

function send(chatId, text, options = {}) {
    return bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        ...options
    })
}

bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id
    send(
        chatId,
        'Hi! I can notify you about visible Starlink passes over your location 🌌.\n\n' +
        'Send your location using the Telegram attach menu, or type:\n' +
        '`/setlocation lat lon`\n\n' +
        'Example:\n`/setlocation 52.52 13.405`'
    )
})

bot.onText(/\/setlocation ([-+]?\d+(\.\d+)?) ([-+]?\d+(\.\d+)?)/, async msg => {
    const chatId = msg.chat.id
    const userId = msg.from.id

    const lat = parseFloat(msg.text.split(' ')[1])
    const lon = parseFloat(msg.text.split(' ')[2])

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
        send(chatId, 'Could not parse coordinates. Use: `/setlocation lat lon`')
        return
    }

    userLocations.set(userId, { lat, lon })
    send(chatId, `Location updated to lat=${lat.toFixed(3)}, lon=${lon.toFixed(3)} ✅`)

    try {
        await scheduleNextPassForUser(userId, chatId, lat, lon, send)
    } catch (err) {
        console.error(err)
        send(chatId, 'Error while computing Starlink passes. Try again later.')
    }
})

// Handle Telegram "live" location messages
bot.on('message', async msg => {
    const chatId = msg.chat.id
    const userId = msg.from.id

    if (msg.location) {
        const { latitude, longitude } = msg.location
        userLocations.set(userId, { lat: latitude, lon: longitude })
        send(
            chatId,
            `Location updated via Telegram 📍\nlat=${latitude.toFixed(
                3
            )}, lon=${longitude.toFixed(3)}`
        )

        try {
            await scheduleNextPassForUser(userId, chatId, latitude, longitude, send)
        } catch (err) {
            console.error(err)
            send(chatId, 'Error while computing Starlink passes. Try again later.')
        }
    }
})

console.log('Starlink bot is running...')
