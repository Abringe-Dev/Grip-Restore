const DAY_MS = 24 * 60 * 60 * 1000
const WEEKS_SHOWN = 7
const HISTORY_LIMIT = 6
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard']
const RECOMMENDATION_WINDOW = 5

export const SESSIONS_GOAL = 8

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

/**
 * Suggests the next difficulty from the five most recent sessions:
 * nudge up after sustained high accuracy, down after a rough patch,
 * otherwise keep the last difficulty the player chose.
 */
export function getRecommendedDifficulty(sessions) {
  const recent = [...sessions]
    .filter(
      (s) =>
        s != null &&
        !Number.isNaN(Date.parse(s.dateISO)) &&
        Number.isFinite(Number(s.accuracy)),
    )
    .sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO))
    .slice(0, RECOMMENDATION_WINDOW)

  if (recent.length === 0) {
    return {
      key: 'easy',
      reason: 'Start with Easy to learn the rhythm — you can move up any time.',
    }
  }

  const average = Math.round(
    recent.reduce((sum, s) => sum + Number(s.accuracy), 0) / recent.length,
  )
  const lastDifficulty = recent.find((s) => DIFFICULTY_ORDER.includes(s.difficulty))?.difficulty
  const baseIndex = Math.max(0, DIFFICULTY_ORDER.indexOf(lastDifficulty ?? 'easy'))

  let index = baseIndex
  if (average >= 85) index = Math.min(DIFFICULTY_ORDER.length - 1, baseIndex + 1)
  else if (average < 60) index = Math.max(0, baseIndex - 1)

  const reason =
    average >= 85
      ? `You’ve averaged ${average}% recently — ready for a step up.`
      : average < 60
        ? `You’ve averaged ${average}% recently — let’s rebuild confidence at this pace.`
        : `You’ve averaged ${average}% recently — this pace fits you well.`

  return { key: DIFFICULTY_ORDER[index], reason }
}

export function formatDays(count) {
  const n = Number.isFinite(Number(count)) ? Math.max(0, Math.round(Number(count))) : 0
  return `${n} ${n === 1 ? 'day' : 'days'}`
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
