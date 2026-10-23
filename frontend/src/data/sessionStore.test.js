import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAccuracyTrend,
  getBestStreak,
  getSessionHistory,
  getSessionsPerWeek,
  getRecommendedDifficulty,
  getWeeklySummary,
  startOfISOWeek,
} from './sessionStore.js'

const at = (iso) => new Date(iso)

function session(overrides = {}) {
  return {
    id: 's1',
    dateISO: '2026-10-21T10:00:00.000Z',
    durationMin: 5,
    gesture: 'Mixed',
    gestures: ['Pinch', 'Fist', 'Open Palm'],
    accuracy: 80,
    difficulty: 'medium',
    hits: 8,
    misses: 2,
    calibration: null,
    ...overrides,
  }
}

test('history maps server sessions, newest first', () => {
  const rows = [
    session({ id: 'old', dateISO: '2026-10-01T10:00:00.000Z', difficulty: 'easy', accuracy: 70 }),
    session({ id: 'new', dateISO: '2026-10-20T10:00:00.000Z' }),
  ]

  const history = getSessionHistory(rows)
  assert.equal(history[0].id, 'new')
  assert.equal(history[0].mode, 'Medium')
  assert.equal(history[0].hits, 8)
  assert.equal(history[0].misses, 2)
  assert.equal(history[1].mode, 'Easy')
  assert.equal(history[1].accuracy, 70)
})

test('history stays compatible with sessions saved before gameplay scoring', () => {
  const legacy = {
    id: 'old-session',
    dateISO: new Date().toISOString(),
    durationMin: 5,
    gesture: 'Pinch',
    gestures: ['Pinch'],
    accuracy: 90,
    calibration: null,
  }

  const history = getSessionHistory([legacy])
  assert.equal(history[0].mode, 'Pinch')
  assert.equal(history[0].hits, null)
  assert.equal(history[0].misses, null)
  assert.equal(history[0].accuracy, 90)
})

test('weekly derivations bucket sessions into the last seven ISO weeks', () => {
  const now = at('2026-10-21T12:00:00.000Z')
  const rows = [
    session({ id: 'this-week', dateISO: '2026-10-20T10:00:00.000Z', accuracy: 80 }),
    session({ id: 'also-this-week', dateISO: '2026-10-19T10:00:00.000Z', accuracy: 60 }),
    session({ id: 'last-week', dateISO: '2026-10-12T10:00:00.000Z', accuracy: 40 }),
    session({ id: 'too-old', dateISO: '2026-01-05T10:00:00.000Z', accuracy: 10 }),
  ]

  const perWeek = getSessionsPerWeek(rows, now)
  assert.equal(perWeek.length, 7)
  assert.equal(perWeek[6].sessions, 2)
  assert.equal(perWeek[5].sessions, 1)
  assert.equal(perWeek.reduce((sum, w) => sum + w.sessions, 0), 3)

  const trend = getAccuracyTrend(rows, now)
  assert.equal(trend[6].accuracy, 70)
  assert.equal(trend[5].accuracy, 40)
  assert.equal(trend[0].accuracy, 0)

  const summary = getWeeklySummary(rows, now)
  assert.equal(summary.accuracy, 70)
  assert.equal(summary.accuracyChange, 30)
  assert.equal(summary.sessionsCompleted, 2)
  assert.equal(summary.sessionsGoal, 8)
})

test('best streak counts consecutive session days and ignores duplicates', () => {
  const rows = [
    session({ id: 'a', dateISO: '2026-10-01T09:00:00.000Z' }),
    session({ id: 'b', dateISO: '2026-10-01T18:00:00.000Z' }),
    session({ id: 'c', dateISO: '2026-10-02T09:00:00.000Z' }),
    session({ id: 'd', dateISO: '2026-10-04T09:00:00.000Z' }),
  ]

  assert.equal(getBestStreak(rows), 2)
  assert.equal(getBestStreak([]), 0)
})

test('startOfISOWeek lands on Monday midnight', () => {
  const monday = startOfISOWeek(at('2026-10-21T15:30:00.000Z'))
  assert.equal(monday.getDay(), 1)
  assert.equal(monday.getHours(), 0)
  assert.equal(monday.getMinutes(), 0)
})

test('recommendation starts new accounts on Easy', () => {
  const rec = getRecommendedDifficulty([])
  assert.equal(rec.key, 'easy')
  assert.match(rec.reason, /learn the rhythm/i)
})

test('recommendation steps up after high accuracy and backs off after a rough patch', () => {
  const dates = ['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-17', '2026-10-16']
  const strong = dates.map((d, i) =>
    session({ id: `up-${i}`, dateISO: `${d}T10:00:00.000Z`, difficulty: 'easy', accuracy: 92 }),
  )
  const up = getRecommendedDifficulty(strong)
  assert.equal(up.key, 'medium')
  assert.match(up.reason, /step up/i)

  const rough = dates.map((d, i) =>
    session({ id: `down-${i}`, dateISO: `${d}T10:00:00.000Z`, difficulty: 'hard', accuracy: 48 }),
  )
  const down = getRecommendedDifficulty(rough)
  assert.equal(down.key, 'medium')
  assert.match(down.reason, /rebuild confidence/i)
})

test('recommendation keeps the last difficulty in the middle band and caps at Hard', () => {
  const steady = [
    session({ id: 's1', dateISO: '2026-10-20T10:00:00.000Z', difficulty: 'medium', accuracy: 70 }),
    session({ id: 's2', dateISO: '2026-10-19T10:00:00.000Z', difficulty: 'medium', accuracy: 74 }),
  ]
  const keep = getRecommendedDifficulty(steady)
  assert.equal(keep.key, 'medium')
  assert.match(keep.reason, /fits you well/i)

  const elite = [
    session({ id: 'e1', dateISO: '2026-10-20T10:00:00.000Z', difficulty: 'hard', accuracy: 96 }),
  ]
  assert.equal(getRecommendedDifficulty(elite).key, 'hard')
})

test('recommendation ignores invalid rows and old sessions outside the window', () => {
  const rows = [
    session({ id: 'bad', dateISO: 'not-a-date', accuracy: 100 }),
    ...Array.from({ length: 5 }, (_, i) =>
      session({
        id: `recent-${i}`,
        dateISO: `2026-10-${20 - i}T10:00:00.000Z`,
        difficulty: 'medium',
        accuracy: 70,
      }),
    ),
    session({ id: 'old', dateISO: '2026-01-01T10:00:00.000Z', difficulty: 'easy', accuracy: 10 }),
  ]

  const rec = getRecommendedDifficulty(rows)
  assert.equal(rec.key, 'medium')
  assert.match(rec.reason, /70%/)
})
