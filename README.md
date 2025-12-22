# 🌌 Starlink Visibility Telegram Bot

A Telegram bot that predicts visible Starlink satellite passes over a user's
location and notifies about the best sightings.

The bot:

- accepts a location via Telegram
- predicts Starlink passes for today or multiple days
- filters by night visibility
- estimates brightness
- shows direction (compass + azimuth)
- works fully offline (no paid APIs)

Built with Node.js, satellite.js v6, and SunCalc.

## ✨ FEATURES

- 📍 Location via Telegram or `/setlocation lat lon`
- 🌅 Accurate sunset / sunrise window
- 🌙 Night-only visibility filtering
- 🛰️ Starlink TLE tracking (Celestrak)
- 🔥 Brightness estimation (very-bright, bright, visible, faint)
- 🧭 Direction at start / peak / end (N, NE, E, …)
- ⭐ Ranks and shows the best passes
- 📅 Supports multiple days (configurable)
- ⏰ Ready for notifications (e.g. 30 min before best pass)

## 🧠 HOW IT WORKS

1. Downloads Starlink TLEs
2. Propagates orbits using SGP4
3. Computes passes over user location
4. Filters passes that:
    - occur at night
    - are sun-illuminated
    - have sufficient elevation & duration
5. Ranks passes by quality
6. Formats output in local time for the location

## 📦 TECH STACK

- Node.js
- satellite.js v6 — orbit propagation
- SunCalc — sun position & night windows
- tz-lookup — lat/lon → timezone
- node-telegram-bot-api
- PM2 (recommended for production)

## 🚀 SETUP

### 1) Clone repository

```bash
git clone https://github.com/yourusername/starlink-telegram-bot.git
cd starlink-telegram-bot
```

### 2) Install dependencies

```bash
yarn install
```

or

```bash
npm install
```

### 3) Environment variables (.env)

```env
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
STARLINK_TLE_URL=https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle
```

⚠️ Never commit real tokens.

### 4) Run locally

```bash
node src/bot.js
```

Or with PM2:

```bash
pm2 start src/bot.js --name starlink-bot
pm2 save
```

## 🤖 TELEGRAM COMMANDS

### `/start`
Shows help message.

### `/setlocation lat lon`
Example:
```
/setlocation 52.52 13.405
```

📍 Send location via Telegram UI:
Attach → Location → Send

### `/days N`
Show passes for the next N days (default: 1)
Example:
```
/days 5
```

## 📊 EXAMPLE OUTPUT

```
🌍 Timezone: Europe/Berlin
🌅 Sunset: 17/12, 15:53 CET
🌄 Sunrise: 18/12, 08:14 CET
🕒 Visibility window: 16:03 → 07:44

#1 ⭐
Satellite: STARLINK-1184
Start: 16:45 CET
Peak:  16:47 CET
End:   16:49 CET
Duration: 4.2 min
Max elevation: 84.6°
Brightness: 🔥 very-bright
Direction:
Start: SW (231°)
Peak:  S  (179°)
End:   SE (121°)
```

## 🌞 BRIGHTNESS ESTIMATION

Brightness is estimated, not exact.

Factors:

- Satellite is sun-illuminated
- Observer is in darkness
- Maximum elevation

Levels:

- 🔥 very-bright (≥ 70°)
- ✨ bright (≥ 45°)
- 👀 visible (≥ 25°)
- 🌫️ faint (≥ 15°)

## 🧭 DIRECTION

Direction is computed using:

- satellite ECI → ECF conversion
- observer look angles
- azimuth → compass conversion

Displayed for:

- start
- peak
- end of each pass

## ⚠️ LIMITATIONS

- No cloud cover prediction
- No exact magnitude (Starlink attitude not public)
- No flare prediction
- In-memory user settings (lost on restart)

## 🛠 FUTURE IMPROVEMENTS

- 🔔 Automatic notifications (best pass only)
- 🌙 Moon interference penalty
- 💾 Persistent storage (SQLite)
- 🌍 Light-pollution aware scoring
- 🧪 Unit tests for orbit logic

## 📜 LICENSE

MIT License — free to use, modify, and distribute.

## ❤️ CREDITS

- Celestrak — TLE data
- satellite.js — orbit propagation
- SunCalc — solar calculations
