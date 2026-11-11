import { GESTURES } from '../game/session.js'
import { buildWeeklyForecast } from './analytics.js'
import { getBestStreak, startOfISOWeek } from './sessionStore.js'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKS_SHOWN = 7

export const REPORT_RANGES = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
]

export const DEFAULT_REPORT_RANGE = '30d'

function toNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toCount(value) {
  const n = toNumber(value)
  return n == null ? 0 : Math.max(0, Math.round(n))
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function reportRange(range) {
  return REPORT_RANGES.find((item) => item.key === range) ?? REPORT_RANGES.find((item) => item.key === DEFAULT_REPORT_RANGE)
}

function rangeBounds(range, now = new Date()) {
  const config = reportRange(range)
  if (!config.days) return { start: null, end: null }
  const start = startOfDay(now)
  start.setDate(start.getDate() - (config.days - 1))
  const end = startOfDay(now)
  end.setDate(end.getDate() + 1)
  return { start: start.getTime(), end: end.getTime() }
}

function previousRangeBounds(range, now = new Date()) {
  const config = reportRange(range)
  if (!config.days) return null
  const { start } = rangeBounds(config.key, now)
  return {
    start: start - config.days * DAY_MS,
    end: start,
  }
}

function inBounds(session, bounds) {
  if (!bounds) return true
  const time = Date.parse(session?.dateISO)
  if (Number.isNaN(time)) return false
  return time >= bounds.start && time < bounds.end
}

function filterByBounds(sessions, bounds) {
  if (!Array.isArray(sessions)) return []
  if (!bounds || bounds.start == null || bounds.end == null) {
    return sessions.filter((session) => !Number.isNaN(Date.parse(session?.dateISO)))
  }
  return sessions.filter((session) => inBounds(session, bounds))
}

export function filterSessionsByRange(sessions, range = DEFAULT_REPORT_RANGE, now = new Date()) {
  return filterByBounds(sessions, rangeBounds(range, now))
}

export function filterSessionsByWeeks(sessions, weeks = WEEKS_SHOWN, now = new Date()) {
  if (!Array.isArray(sessions)) return []
  const end = startOfISOWeek(now)
  end.setDate(end.getDate() + 7)
  const start = startOfISOWeek(now)
  start.setDate(start.getDate() - (Math.max(1, weeks) - 1) * 7)
  return sessions.filter((session) => {
    const time = Date.parse(session?.dateISO)
    return !Number.isNaN(time) && time >= start.getTime() && time < end.getTime()
  })
}

function gestureCounts(stats) {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
    return { hits: 0, misses: 0 }
  }
  let hits = 0
  let misses = 0
  for (const { key } of GESTURES) {
    const entry = stats[key]
    if (!entry || typeof entry !== 'object') continue
    hits += toCount(entry.hits)
    misses += toCount(entry.misses)
  }
  return { hits, misses }
}

function sessionCounts(session) {
  const hits = toNumber(session?.hits)
  const misses = toNumber(session?.misses)
  if (hits != null || misses != null) {
    return { hits: toCount(hits), misses: toCount(misses) }
  }
  return gestureCounts(session?.gestureStats)
}

export function summarizeSessions(sessions) {
  const rows = Array.isArray(sessions) ? sessions : []
  let hits = 0
  let misses = 0
  let counterSessions = 0
  let totalMinutes = 0
  let accuracyTotal = 0
  let accuracyCount = 0
  const activeDays = new Set()

  for (const session of rows) {
    const counts = sessionCounts(session)
    if (counts.hits + counts.misses > 0) {
      hits += counts.hits
      misses += counts.misses
      counterSessions += 1
    }

    const duration = toNumber(session?.durationMin)
    if (duration != null) totalMinutes += Math.max(0, Math.round(duration))

    const accuracy = toNumber(session?.accuracy)
    if (accuracy != null) {
      accuracyTotal += Math.max(0, Math.min(100, accuracy))
      accuracyCount += 1
    }

    const time = Date.parse(session?.dateISO)
    if (!Number.isNaN(time)) {
      const day = new Date(time)
      activeDays.add(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`)
    }
  }

  const attempts = hits + misses
  return {
    sessionCount: rows.length,
    totalMinutes,
    hits,
    misses,
    attempts,
    accuracy: attempts > 0
      ? Math.round((hits * 100) / attempts)
      : accuracyCount > 0
        ? Math.round(accuracyTotal / accuracyCount)
        : 0,
    hasCounters: counterSessions > 0,
    activeDays: activeDays.size,
    bestStreak: getBestStreak(rows),
  }
}

export function getGestureTotals(sessions) {
  const rows = Array.isArray(sessions) ? sessions : []
  const totals = Object.fromEntries(
    GESTURES.map(({ key }) => [key, { hits: 0, misses: 0 }]),
  )

  for (const session of rows) {
    const stats = session?.gestureStats
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) continue
    for (const { key } of GESTURES) {
      const entry = stats[key]
      if (!entry || typeof entry !== 'object') continue
      totals[key].hits += toCount(entry.hits)
      totals[key].misses += toCount(entry.misses)
    }
  }

  const totalMisses = GESTURES.reduce((sum, { key }) => sum + totals[key].misses, 0)
  return GESTURES.map((gesture) => {
    const { hits, misses } = totals[gesture.key]
    const attempts = hits + misses
    return {
      ...gesture,
      hits,
      misses,
      attempts,
      accuracy: attempts > 0 ? Math.round((hits * 100) / attempts) : null,
      missShare: totalMisses > 0 ? Math.round((misses * 100) / totalMisses) : 0,
      hasData: attempts > 0,
    }
  })
}

function weekIndexOf(date, now) {
  const thisWeek = startOfISOWeek(now).getTime()
  const week = startOfISOWeek(date).getTime()
  const index = WEEKS_SHOWN - 1 - Math.round((thisWeek - week) / (7 * DAY_MS))
  return index >= 0 && index < WEEKS_SHOWN ? index : -1
}

export function getWeeklyOutcomes(sessions, now = new Date()) {
  const rows = Array.isArray(sessions) ? sessions : []
  const anchor = startOfISOWeek(now).getTime()
  const buckets = Array.from({ length: WEEKS_SHOWN }, (_, index) => ({
    week: `W${index + 1}`,
    start: anchor - (WEEKS_SHOWN - 1 - index) * 7 * DAY_MS,
    sessions: 0,
    hits: 0,
    misses: 0,
  }))

  for (const session of rows) {
    const time = Date.parse(session?.dateISO)
    if (Number.isNaN(time)) continue
    const index = weekIndexOf(new Date(time), now)
    if (index < 0) continue
    const counts = sessionCounts(session)
    buckets[index].sessions += 1
    buckets[index].hits += counts.hits
    buckets[index].misses += counts.misses
  }

  return buckets.map((bucket) => ({
    week: bucket.week,
    start: bucket.start,
    sessions: bucket.sessions,
    hits: bucket.hits,
    misses: bucket.misses,
    attempted: bucket.hits + bucket.misses,
  }))
}

export function getMissInsights(sessions) {
  const gestures = getGestureTotals(sessions)
  const totalMisses = gestures.reduce((sum, gesture) => sum + gesture.misses, 0)
  const totalAttempts = gestures.reduce((sum, gesture) => sum + gesture.attempts, 0)
  const mostMissed = gestures
    .filter((gesture) => gesture.misses > 0)
    .sort((a, b) => b.misses - a.misses || b.attempts - a.attempts)[0] ?? null

  return {
    gestures,
    totalMisses,
    totalAttempts,
    missRate: totalAttempts > 0 ? Math.round((totalMisses * 100) / totalAttempts) : 0,
    mostMissed,
  }
}

export function buildReport(sessions, range = DEFAULT_REPORT_RANGE, now = new Date()) {
  const config = reportRange(range)
  const filtered = filterSessionsByRange(sessions, config.key, now)
  const previousBounds = previousRangeBounds(config.key, now)
  const previous = previousBounds ? filterByBounds(sessions, previousBounds) : []
  const summary = summarizeSessions(filtered)
  const previousSummary = summarizeSessions(previous)
  const misses = getMissInsights(filtered)

  return {
    range: config,
    sessions: filtered,
    summary,
    previousSummary,
    accuracyChange: previousSummary.sessionCount > 0
      ? summary.accuracy - previousSummary.accuracy
      : null,
    gestures: misses.gestures,
    missInsights: misses,
    weekly: getWeeklyOutcomes(filtered, now),
    forecast: buildWeeklyForecast(filtered, now),
  }
}
