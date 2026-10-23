import { normalizeEmail } from './userStore.js'

const SESSIONS_PREFIX = 'grip-restore-sessions-v1:'
const DAY_MS = 24 * 60 * 60 * 1000
const WEEKS_SHOWN = 7
const HISTORY_LIMIT = 6
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export const SESSIONS_GOAL = 8

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
  const raw = readRaw(sessionsKey(id))
  if (raw == null) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    if (!parsed.every(isValidSession)) return []
    return parsed
  } catch {
    return []
  }
}

/**
 * F5 contract: persists one completed session for the user.
 * Shape: { durationMin, gesture, gestures?, accuracy, difficulty?, hits?, misses?, calibration?, dateISO?, id? }
 */
export function saveSession(userId, session) {
  const id = normalizeEmail(userId)
  if (!id) return []
  const rawDate = session && typeof session.dateISO === 'string' ? session.dateISO : ''
  const rawHits = session && session.hits != null ? Number(session.hits) : NaN
  const rawMisses = session && session.misses != null ? Number(session.misses) : NaN
  const entry = {
    id: (session && session.id) || makeId(),
    dateISO: !Number.isNaN(Date.parse(rawDate)) ? rawDate : new Date().toISOString(),
    durationMin: Number(session && session.durationMin) || 0,
    gesture: String((session && session.gesture) || ''),
    gestures: session && Array.isArray(session.gestures) ? session.gestures : [],
    accuracy: clampAccuracy(session && session.accuracy),
    difficulty: typeof (session && session.difficulty) === 'string' ? session.difficulty : '',
    hits: Number.isFinite(rawHits) ? Math.max(0, Math.floor(rawHits)) : null,
    misses: Number.isFinite(rawMisses) ? Math.max(0, Math.floor(rawMisses)) : null,
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
      mode: DIFFICULTY_LABELS[s.difficulty] || s.gesture || (s.gestures && s.gestures[0]) || 'Session',
      difficulty: s.difficulty || '',
      hits: Number.isFinite(s.hits) ? Math.max(0, Math.round(s.hits)) : null,
      misses: Number.isFinite(s.misses) ? Math.max(0, Math.round(s.misses)) : null,
      accuracy: Math.round(s.accuracy),
      duration: `${s.durationMin} min`,
    }))
}