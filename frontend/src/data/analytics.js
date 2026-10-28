const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_WINDOW = 5
const PRIOR_WINDOW = 5
const GESTURE_WINDOW = 3
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard']
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const PLAN_OFFSETS = [1, 3, 5, 7]

export const FORECAST_GESTURES = [
  { key: 'pinch', label: 'Pinch' },
  { key: 'fist', label: 'Fist' },
  { key: 'palm', label: 'Open Palm' },
]

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function average(values) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function addDays(date, offset) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function dayLabel(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function dateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function sortedSessions(sessions) {
  return [...(Array.isArray(sessions) ? sessions : [])]
    .filter((s) => s && !Number.isNaN(Date.parse(s.dateISO)) && toNumber(s.accuracy) !== null)
    .sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO))
}

function outcomeFor(accuracy) {
  if (accuracy == null) {
    return { label: 'Getting started', tone: 'blue' }
  }
  if (accuracy >= 85) return { label: 'Likely strong', tone: 'green' }
  if (accuracy >= 70) return { label: 'Likely steady', tone: 'blue' }
  if (accuracy >= 55) return { label: 'Likely mixed', tone: 'purple' }
  return { label: 'Likely challenging', tone: 'purple' }
}

/**
 * Last three sessions with data for each grip. The game only writes
 * gestureStats for newer sessions, so legacy rows are simply ignored.
 */
export function getGesturePerformance(sessions) {
  const sorted = sortedSessions(sessions)
  return FORECAST_GESTURES.map(({ key, label }) => {
    let hits = 0
    let misses = 0
    let sessionCount = 0
    for (const session of sorted) {
      if (sessionCount >= GESTURE_WINDOW) break
      const entry = session.gestureStats?.[key]
      if (!entry) continue
      const rowHits = Math.max(0, toNumber(entry.hits) ?? 0)
      const rowMisses = Math.max(0, toNumber(entry.misses) ?? 0)
      if (rowHits + rowMisses === 0) continue
      hits += rowHits
      misses += rowMisses
      sessionCount += 1
    }
    const attempts = hits + misses
    return {
      gesture: key,
      label,
      attempts,
      hits,
      misses,
      accuracy: attempts > 0 ? Math.round((hits * 100) / attempts) : null,
      sessions: sessionCount,
    }
  })
}

function recommendDifficulty({ hasData, recent, recentAverage, lastThreeStrong }) {
  if (!hasData) {
    return {
      key: 'easy',
      label: 'Easy',
      reason: 'Start with Easy to learn the rhythm — you can move up any time.',
    }
  }

  const lastDifficulty = recent.find((s) => DIFFICULTY_ORDER.includes(s.difficulty))?.difficulty
  let index = Math.max(0, DIFFICULTY_ORDER.indexOf(lastDifficulty ?? 'easy'))
  const label = DIFFICULTY_LABELS[DIFFICULTY_ORDER[index]]

  if (recent.length >= 3 && recentAverage >= 85 && lastThreeStrong) {
    if (index < DIFFICULTY_ORDER.length - 1) index += 1
    const nextLabel = DIFFICULTY_LABELS[DIFFICULTY_ORDER[index]]
    return {
      key: DIFFICULTY_ORDER[index],
      label: nextLabel,
      reason: index === DIFFICULTY_ORDER.length - 1 && nextLabel !== label
        ? `You've averaged ${recentAverage}% and your last three sessions were 80%+, so the plan steps up to ${nextLabel}.`
        : nextLabel === label
          ? `You're already at Hard — keep the challenge while your form holds.`
          : `You've averaged ${recentAverage}% and your last three sessions were 80%+, so the plan steps up to ${nextLabel}.`,
    }
  }

  if (recentAverage < 60) {
    if (index > 0) index -= 1
    return {
      key: DIFFICULTY_ORDER[index],
      label: DIFFICULTY_LABELS[DIFFICULTY_ORDER[index]],
      reason: `Recent accuracy is ${recentAverage}% — the plan eases back to ${DIFFICULTY_LABELS[DIFFICULTY_ORDER[index]]} to rebuild confidence.`,
    }
  }

  return {
    key: DIFFICULTY_ORDER[index],
    label,
    reason: `Recent accuracy is ${recentAverage}% — ${label} is the right challenge for now.`,
  }
}

function trendCopy(delta) {
  if (delta == null) {
    return {
      label: 'starting',
      sentence: 'A few more sessions will make the trend easier to call.',
    }
  }
  if (delta >= 5) {
    return {
      label: 'improving',
      sentence: `Accuracy is trending up ${delta} points versus the previous sessions.`,
    }
  }
  if (delta <= -5) {
    return {
      label: 'dipping',
      sentence: `Accuracy is trending down ${Math.abs(delta)} points versus the previous sessions.`,
    }
  }
  return {
    label: 'steady',
    sentence: 'Accuracy is holding steady from one block of sessions to the next.',
  }
}

export function buildWeeklyForecast(sessions, now = new Date()) {
  const sorted = sortedSessions(sessions)
  const recent = sorted.slice(0, RECENT_WINDOW)
  const prior = sorted.slice(RECENT_WINDOW, RECENT_WINDOW + PRIOR_WINDOW)
  const recentAverage = average(recent.map((s) => toNumber(s.accuracy)))
  const priorAverage = average(prior.map((s) => toNumber(s.accuracy)))
  const delta = recentAverage == null || priorAverage == null ? null : recentAverage - priorAverage
  const trend = trendCopy(delta)
  const hasData = recent.length > 0
  const trendAdjustment = delta == null ? 0 : clamp(Math.round(delta / 2), -5, 5)
  const predictedAccuracy = recentAverage == null
    ? null
    : clamp(recentAverage + trendAdjustment, 0, 100)
  const outcome = outcomeFor(predictedAccuracy)
  const lastThreeStrong = recent.length >= 3 && recent.slice(0, 3).every((s) => toNumber(s.accuracy) >= 80)
  const strongReady = hasData && recent.length >= 3 && recentAverage >= 85 && lastThreeStrong
  const difficulty = recommendDifficulty({
    hasData,
    recent,
    recentAverage,
    lastThreeStrong,
  })
  const sessionCount = !hasData || recentAverage >= 60 ? (strongReady ? 4 : 3) : 2
  const durationMin = !hasData || recentAverage < 60 ? 5 : 10
  const confidence = recent.length >= 5 ? 'high' : recent.length >= 3 ? 'medium' : 'low'

  const gesturePerformance = getGesturePerformance(sorted)
  const weak = gesturePerformance
    .filter((g) => g.accuracy != null && g.attempts >= 3 && g.accuracy < 75)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 2)
  const focusPool = weak.length > 0
    ? weak
    : FORECAST_GESTURES.map(({ key }) => gesturePerformance.find((g) => g.gesture === key))

  const sessionDates = PLAN_OFFSETS.slice(0, sessionCount)
  const sessionByOffset = new Map()

  sessionDates.forEach((offset, index) => {
    const focus = focusPool[index % focusPool.length] ?? null
    const focusLabel = focus?.label ?? 'Balanced mix'
    const date = addDays(now, offset)
    sessionByOffset.set(offset, {
      offset,
      dateISO: date.toISOString(),
      weekday: dayLabel(date),
      dateLabel: dateLabel(date),
      durationMin,
      difficulty: difficulty.key,
      difficultyLabel: difficulty.label,
      focusGesture: focus?.gesture ?? null,
      focusLabel,
      focusAccuracy: focus?.accuracy ?? null,
      expectedAccuracy: predictedAccuracy,
      expectedLabel: outcome.label,
      reason: weak.length > 0 && focus?.attempts
        ? `${focus.accuracy}% on ${focus.label} across ${focus.attempts} recent attempts — a focused session will help.`
        : `A balanced mix keeps every grip engaged at ${difficulty.label}.`,
    })
  })

  const days = Array.from({ length: 7 }, (_, index) => {
    const offset = index + 1
    const date = addDays(now, offset)
    return {
      offset,
      dateISO: date.toISOString(),
      weekday: dayLabel(date),
      dateLabel: dateLabel(date),
      isSessionDay: sessionByOffset.has(offset),
      session: sessionByOffset.get(offset) ?? null,
    }
  })

  const explanation = []
  if (hasData) {
    explanation.push(
      `Your last ${recent.length} ${recent.length === 1 ? 'session' : 'sessions'} averaged ${recentAverage}% accuracy.`,
    )
    explanation.push(trend.sentence)
    explanation.push(
      `The forecast is ${predictedAccuracy}% (${outcome.label.toLowerCase()}) after adjusting for that trend.`,
    )
    if (weak.length > 0) {
      explanation.push(
        ...weak.map(
          (g) => `${g.label} is at ${g.accuracy}% across ${g.attempts} recent attempts, so it gets extra focus.`,
        ),
      )
    } else {
      explanation.push('No single grip is lagging, so the plan rotates all three evenly.')
    }
    explanation.push(difficulty.reason)
  } else {
    explanation.push('No play sessions yet, so the plan starts with a gentle, balanced week.')
    explanation.push('Three 5-minute Easy sessions on alternating days build the habit before we forecast accuracy.')
    explanation.push('After a few sessions, the plan will adapt to your recent accuracy and grip trends.')
  }

  explanation.push(
    recentAverage != null && recentAverage < 60
      ? 'Shorter, less frequent sessions keep the load light while you rebuild confidence.'
      : strongReady
        ? 'Four sessions fit your strong recent form without scheduling back-to-back days.'
        : 'Sessions sit on alternating days so your hands get recovery time.',
  )
  explanation.push(
    hasData
      ? `Forecast confidence is ${confidence}, based on ${recent.length} recent ${recent.length === 1 ? 'session' : 'sessions'}.`
      : 'Forecast confidence will grow as you complete sessions.',
  )

  return {
    hasData,
    recentCount: recent.length,
    recentAverage,
    priorAverage,
    trendDelta: delta,
    trendLabel: trend.label,
    trendSentence: trend.sentence,
    predictedAccuracy,
    outcomeLabel: outcome.label,
    outcomeTone: outcome.tone,
    confidence,
    difficulty,
    sessionCount,
    durationMin,
    focus: weak.map((g) => ({
      gesture: g.gesture,
      label: g.label,
      accuracy: g.accuracy,
      attempts: g.attempts,
    })),
    gesturePerformance,
    explanation,
    sessions: [...sessionByOffset.values()],
    days,
  }
}

// Kept small and local to avoid exporting date internals just for tests.
export function planDateOffset(dateISO, now = new Date()) {
  const target = new Date(dateISO)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - start.getTime()) / DAY_MS)
}
