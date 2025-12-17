const fetch = require('node-fetch')
const satellite = require('satellite.js')
const SunCalc = require('suncalc')
const config = require('./config')

/**
 * Fetch Starlink TLEs from Celestrak (or another source).
 * Returns array of { name, line1, line2 }.
 */
async function fetchStarlinkTles() {
    const res = await fetch(config.starlinkTleUrl)
    if (!res.ok) {
        throw new Error(`Failed to fetch TLEs: ${res.status} ${res.statusText}`)
    }
    const text = await res.text()

    const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)

    const result = []
    for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i]
        const line1 = lines[i + 1]
        const line2 = lines[i + 2]
        if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
            result.push({ name, line1, line2 })
        } else {
            // TLE format might be 2-line with no name; handle that gracefully.
            // For now, skip malformed triplets.
        }
    }

    return result
}

/**
 * Build a satrec from a TLE object.
 */
function makeSatrecFromTle(tle) {
    return satellite.twoline2satrec(tle.line1, tle.line2)
}

/**
 * Compute satellite look angles (az, el in degrees) from a given observer.
 * @param {satellite.SatRec} satrec
 * @param {Date} time
 * @param {number} latDeg
 * @param {number} lonDeg
 * @param {number} heightKm
 */
function getLookAngles(satrec, time, latDeg, lonDeg, heightKm = 0) {
    const positionAndVelocity = satellite.propagate(satrec, time)
    const positionEci = positionAndVelocity.position

    if (!positionEci) {
        return null // propagation failed for this time (can happen for old TLEs)
    }

    const gmst = satellite.gstime(
        time.getUTCFullYear(),
        time.getUTCMonth() + 1,
        time.getUTCDate(),
        time.getUTCHours(),
        time.getUTCMinutes(),
        time.getUTCSeconds()
    )

    const positionEcf = satellite.eciToEcf(positionEci, gmst)

    const observerGd = {
        longitude: satellite.degreesToRadians(lonDeg),
        latitude: satellite.degreesToRadians(latDeg),
        height: heightKm / 1000 // satellite.js expects km? (we pass km directly below)
    }

    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf)

    return {
        azimuthDeg: satellite.radiansToDegrees(lookAngles.azimuth),
        elevationDeg: satellite.radiansToDegrees(lookAngles.elevation),
        rangeKm: lookAngles.rangeSat
    }
}

/**
 * Check if the *ground* is dark enough (night / evening) for observation.
 * Uses Sun altitude at observer location.
 */
function isGroundDarkEnough(time, latDeg, lonDeg) {
    const sunPos = SunCalc.getPosition(time, latDeg, lonDeg)
    const sunAltDeg = (sunPos.altitude * 180) / Math.PI
    return sunAltDeg < config.sunAltThresholdDeg
}

/**
 * TODO: Determine if satellite is sunlit (not in Earth's shadow).
 * For now, we *skip* this and only check that the ground is dark.
 *
 * In a production version you’d:
 *   - compute Sun ECI position,
 *   - check if satellite lies in Earth’s umbra/penumbra geometrically.
 */
function isSatelliteSunlitPlaceholder() {
    return true
}

/**
 * Scan next N hours for visible passes for a *single* satellite.
 *
 * Returns an array of passes:
 *   [{ start, end, maxElevationDeg, maxTime }]
 */
function findVisiblePassesForSatellite(satrec, latDeg, lonDeg, now = new Date()) {
    const passes = []

    const stepMs = config.timeStepSeconds * 1000
    const horizonMs = config.maxLookAheadHours * 3600 * 1000
    const endTime = new Date(now.getTime() + horizonMs)

    let inPass = false
    let passStart = null
    let lastTime = now

    let maxElevationDeg = -90
    let maxTime = null

    for (let t = now.getTime(); t <= endTime.getTime(); t += stepMs) {
        const time = new Date(t)

        const look = getLookAngles(satrec, time, latDeg, lonDeg, 0)
        if (!look) {
            continue
        }

        const elevationDeg = look.elevationDeg

        const groundDark = isGroundDarkEnough(time, latDeg, lonDeg)
        const satSunlit = isSatelliteSunlitPlaceholder()

        const visibleNow =
            elevationDeg >= config.minElevationDeg && groundDark && satSunlit

        if (visibleNow && !inPass) {
            // Start of a new pass
            inPass = true
            passStart = time
            maxElevationDeg = elevationDeg
            maxTime = time
        } else if (visibleNow && inPass) {
            // Continue pass and update max elevation
            if (elevationDeg > maxElevationDeg) {
                maxElevationDeg = elevationDeg
                maxTime = time
            }
        } else if (!visibleNow && inPass) {
            // Pass ended at previous time step
            const passEnd = lastTime
            passes.push({
                start: passStart,
                end: passEnd,
                maxElevationDeg,
                maxTime
            })
            inPass = false
            passStart = null
            maxElevationDeg = -90
            maxTime = null
        }

        lastTime = time
    }

    // Handle if pass is ongoing at horizon end
    if (inPass && passStart) {
        passes.push({
            start: passStart,
            end: endTime,
            maxElevationDeg,
            maxTime
        })
    }

    return passes
}

/**
 * Get next visible pass over given location using the *first* Starlink sat.
 * For demo: pick the first TLE in the list.
 *
 * @returns {Promise<{satelliteName, pass} | null>}
 */
async function getNextVisibleStarlinkPass(latDeg, lonDeg, now = new Date()) {
    const tles = await fetchStarlinkTles()
    if (!tles.length) return null

    // For a more serious version:
    // - pick multiple sats,
    // - find passes for each,
    // - pick earliest upcoming pass overall.
    const tle = tles[0]
    const satrec = makeSatrecFromTle(tle)
    const passes = findVisiblePassesForSatellite(satrec, latDeg, lonDeg, now)

    if (!passes.length) return null

    // Choose earliest pass.start > now
    const upcoming = passes
        .filter(p => p.start > now)
        .sort((a, b) => a.start - b.start)[0]

    if (!upcoming) return null

    return {
        satelliteName: tle.name,
        pass: upcoming
    }
}

module.exports = {
    getNextVisibleStarlinkPass
}
