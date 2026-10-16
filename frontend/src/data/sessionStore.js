import { normalizeEmail } from './userStore.js'

const SESSIONS_PREFIX = 'grip-restore-sessions-v1:'
const DAY_MS = 24 * 60 * 60 * 1000
const WEEKS_SHOWN = 7
const HISTORY_LIMIT = 6

export const SESSIONS_GOAL = 8

// Seed targets (reproduce the original demo display exactly).
const SEED_WEEK_COUNTS = [2, 3, 3, 4, 5, 4, 5]
const SEED_WEEK_ACCURACY = [62, 68, 71, 75, 79, 83, 87]
const SEED_GESTURES = ['Open Palm', 'Fist', 'Pinch']
const SEED_DURATIONS = [10, 5]
// Weekday slots (Mon-first offsets) used when topping up older weeks.
// Spread out to avoid manufacturing long streaks outside the backbone.
const TOPUP_SLOTS = [0, 2, 4, 6, 1, 3, 5]
// Same-day times used only to top up the CURRENT week. Guarantee is
// day-granular: no session is ever dated on a future calendar day (intraday
// clock times are fixed decorative values, so a same-day time may read later
// than first-visit time — harmless, since every consumer buckets, streaks,
// sorts, and labels by calendar day).
const TOPUP_TODAY_TIMES = [[8, 5], [10, 15], [12, 30], [15, 45], [17, 20]]
const STREAK_BACKBONE_DAYS = 6

export function sessionsKey(userId) {
  return SESSIONS_PREFIX + normalizeEmail(userId)
}

function makeId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    /* fall through to timestamp id */
  }
  return `s-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function clampAccuracy(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

function isValidSession(s) {
  return (
    s != null &&
    typeof s === 'object' &&
    typeof s.id === 'string' &&
    typeof s.dateISO === 'string' &&
    !Number.isNaN(Date.parse(s.dateISO)) &&
    Number.isFinite(s.durationMin) &&
    typeof s.accuracy === 'number' &&
    Number.isFinite(s.accuracy)
  )
}

function readRaw(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return undefined
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* quota/blocked storage — persistence is best-effort */
  }
}

export function loadSessions(userId) {
  const id = normalizeEmail(userId)
  if (!id) return []
  const key = sessionsKey(id)
  const raw = readRaw(key)
  if (raw == null) {
    const seeded = seedSessions()
    writeRaw(key, JSON.stringify(seeded))
    return seeded
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('bad shape')
    if (!parsed.every(isValidSession)) throw new Error('bad items')
    return parsed
  } catch {
    const seeded = seedSessions()
    writeRaw(key, JSON.stringify(seeded))
    return seeded
  }
}

/**
 * F5 contract: persists one completed session for the user.
 * Shape: { durationMin, gesture, gestures?, accuracy, calibration?, dateISO?, id? }
 */
export function saveSession(userId, session) {
  const id = normalizeEmail(userId)
  if (!id) return []
  const rawDate = session && typeof session.dateISO === 'string' ? session.dateISO : ''
  const entry = {
    id: (session && session.id) || makeId(),
    dateISO: !Number.isNaN(Date.parse(rawDate)) ? rawDate : new Date().toISOString(),
    durationMin: Number(session && session.durationMin) || 0,
    gesture: String((session && session.gesture) || ''),
    gestures: session && Array.isArray(session.gestures) ? session.gestures : [],
    accuracy: clampAccuracy(session && session.accuracy),
    calibration: (session && session.calibration) ?? null,
  }
  if (!isValidSession(entry)) return loadSessions(id)
  const next = [entry, ...loadSessions(id)]
  writeRaw(sessionsKey(id), JSON.stringify(next))
  return next
}

// --- Dates (Monday-start ISO weeks, local calendar) ---

export function startOfISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function weekIndexOf(date, now) {
  const thisWeek = startOfISOWeek(now).getTime()
  const week = startOfISOWeek(date).getTime()
  const idx = WEEKS_SHOWN - 1 - Math.round((thisWeek - week) / (7 * DAY_MS))
  return idx >= 0 && idx < WEEKS_SHOWN ? idx : -1
}

function bucketSessionsByWeek(sessions, now) {
  const anchor = startOfISOWeek(now).getTime()
  const buckets = Array.from({ length: WEEKS_SHOWN }, (_, i) => ({
    week: `W${i + 1}`,
    start: anchor - (WEEKS_SHOWN - 1 - i) * 7 * DAY_MS,
    sessions: [],
  }))
  sessions.forEach((s) => {
    const idx = weekIndexOf(new Date(s.dateISO), now)
    if (idx >= 0) buckets[idx].sessions.push(s)
  })
  return buckets
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// --- Seed (relative-to-today demo data, exact display targets) ---

function atDay(base, back, hour, minute) {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - back)
  d.setHours(hour, minute, 0, 0)
  return d
}

function spreadAccuracy(target, position, count) {
  if (count >= 2) {
    if (position === 0) return target + 3
    if (position === 1) return target - 3
  }
  return target
}

export function seedSessions(now = new Date()) {
  const dates = []
  for (let back = 0; back < STREAK_BACKBONE_DAYS; back += 1) {
    dates.push(atDay(now, back, 19, 10))
  }
  const occupied = new Set(dates.map((d) => dayKey(d)))
  const excluded = dayKey(atDay(now, STREAK_BACKBONE_DAYS, 12, 0))
  const todayStart = atDay(now, 0, 0, 0)
  const counts = new Array(WEEKS_SHOWN).fill(0)
  dates.forEach((d) => {
    const i = weekIndexOf(d, now)
    if (i >= 0) counts[i] += 1
  })
  for (let w = 0; w < WEEKS_SHOWN; w += 1) {
    const monday = new Date(startOfISOWeek(now).getTime() - (WEEKS_SHOWN - 1 - w) * 7 * DAY_MS)
    for (const slot of TOPUP_SLOTS) {
      if (counts[w] >= SEED_WEEK_COUNTS[w]) break
      const d = new Date(monday)
      d.setDate(d.getDate() + slot)
      d.setHours(10, 0, 0, 0)
      if (d > now) continue
      const key = dayKey(d)
      if (key === excluded || occupied.has(key)) continue
      occupied.add(key)
      dates.push(d)
      counts[w] += 1
    }
    if (w === WEEKS_SHOWN - 1) {
      for (const [hour, minute] of TOPUP_TODAY_TIMES) {
        if (counts[w] >= SEED_WEEK_COUNTS[w]) break
        const d = new Date(todayStart)
        d.setHours(hour, minute, 0, 0)
        dates.push(d)
        counts[w] += 1
      }
    }
  }
  const byWeek = Array.from({ length: WEEKS_SHOWN }, () => [])
  dates.forEach((d) => {
    const i = weekIndexOf(d, now)
    if (i >= 0) byWeek[i].push(d)
  })
  const sessions = []
  let order = 0
  byWeek.forEach((weekDates, w) => {
    weekDates
      .sort((a, b) => b - a)
      .forEach((d, position) => {
        sessions.push({
          id: `seed-${w}-${position}`,
          dateISO: d.toISOString(),
          durationMin: SEED_DURATIONS[order % SEED_DURATIONS.length],
          gesture: SEED_GESTURES[order % SEED_GESTURES.length],
          gestures: ['Pinch', 'Fist', 'Open Palm'],
          accuracy: spreadAccuracy(SEED_WEEK_ACCURACY[w], position, weekDates.length),
          calibration: null,
        })
        order += 1
      })
  })
  sessions.sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO))
  return sessions
}

// --- Derivations (pure; `now` injectable for tests) ---

export function getSessionsPerWeek(sessions, now = new Date()) {
  return bucketSessionsByWeek(sessions, now).map((b) => ({ week: b.week, sessions: b.sessions.length }))
}

export function getAccuracyTrend(sessions, now = new Date()) {
  let carry = 0
  return bucketSessionsByWeek(sessions, now).map((b) => {
    if (b.sessions.length > 0) {
      carry = Math.round(b.sessions.reduce((sum, s) => sum + s.accuracy, 0) / b.sessions.length)
    }
    return { week: b.week, accuracy: carry }
  })
}

export function getBestStreak(sessions) {
  const days = new Set()
  sessions.forEach((s) => {
    const t = Date.parse(s.dateISO)
    if (Number.isNaN(t)) return
    const d = new Date(t)
    d.setHours(0, 0, 0, 0)
    days.add(d.getTime())
  })
  let best = 0
  days.forEach((t) => {
    const prev = new Date(t)
    prev.setDate(prev.getDate() - 1)
    prev.setHours(0, 0, 0, 0)
    if (!days.has(prev.getTime())) {
      let len = 1
      let cur = new Date(t)
      for (;;) {
        const nxt = new Date(cur)
        nxt.setDate(nxt.getDate() + 1)
        nxt.setHours(0, 0, 0, 0)
        if (!days.has(nxt.getTime())) break
        len += 1
        cur = nxt
      }
      if (len > best) best = len
    }
  })
  return best
}

export function getWeeklySummary(sessions, now = new Date()) {
  const trend = getAccuracyTrend(sessions, now)
  const counts = getSessionsPerWeek(sessions, now)
  const cur = trend[WEEKS_SHOWN - 1].accuracy
  const prev = trend[WEEKS_SHOWN - 2].accuracy
  return {
    accuracy: cur,
    accuracyChange: cur - prev,
    sessionsCompleted: counts[WEEKS_SHOWN - 1].sessions,
    sessionsGoal: SESSIONS_GOAL,
    bestStreak: getBestStreak(sessions),
  }
}

function formatDate(dateISO) {
  return new Date(dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getSessionHistory(sessions, limit = HISTORY_LIMIT) {
  return [...sessions]
    .sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO))
    .slice(0, limit)
    .map((s) => ({
      id: s.id,
      date: formatDate(s.dateISO),
      gesture: s.gesture || (s.gestures && s.gestures[0]) || '',
      accuracy: Math.round(s.accuracy),
      duration: `${s.durationMin} min`,
    }))
}