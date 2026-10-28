import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWeeklyForecast,
  getGesturePerformance,
  planDateOffset,
} from './analytics.js'

const NOW = new Date(2026, 9, 28, 12, 0, 0)

function session(daysAgo, accuracy, extra = {}) {
  const date = new Date(NOW)
  date.setDate(date.getDate() - daysAgo)
  return { id: `s-${daysAgo}-${accuracy}`, dateISO: date.toISOString(), accuracy, ...extra }
}

function forecast(sessions) {
  return buildWeeklyForecast(sessions, NOW)
}

test('no sessions plans a gentle balanced week', () => {
  const plan = forecast([])

  assert.equal(plan.hasData, false)
  assert.equal(plan.predictedAccuracy, null)
  assert.equal(plan.sessionCount, 3)
  assert.equal(plan.durationMin, 5)
  assert.equal(plan.difficulty.key, 'easy')
  assert.equal(plan.outcomeLabel, 'Getting started')
  assert.deepEqual(plan.days.map((d) => d.offset), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(plan.sessions.map((s) => s.offset), [1, 3, 5])
  assert.deepEqual(plan.sessions.map((s) => s.focusGesture), ['pinch', 'fist', 'palm'])
  assert.ok(plan.explanation.length >= 3)
})

test('strong recent form steps difficulty up and schedules four sessions', () => {
  const plan = forecast([
    session(1, 90, { difficulty: 'medium' }),
    session(2, 88, { difficulty: 'medium' }),
    session(3, 86, { difficulty: 'medium' }),
    session(4, 84, { difficulty: 'medium' }),
    session(5, 83, { difficulty: 'medium' }),
    session(6, 70, { difficulty: 'medium' }),
    session(7, 70, { difficulty: 'medium' }),
    session(8, 70, { difficulty: 'medium' }),
    session(9, 70, { difficulty: 'medium' }),
    session(10, 70, { difficulty: 'medium' }),
  ])

  assert.equal(plan.recentAverage, 86)
  assert.equal(plan.trendDelta, 16)
  assert.equal(plan.trendLabel, 'improving')
  assert.equal(plan.predictedAccuracy, 91)
  assert.equal(plan.outcomeLabel, 'Likely strong')
  assert.equal(plan.difficulty.key, 'hard')
  assert.equal(plan.sessionCount, 4)
  assert.equal(plan.durationMin, 10)
  assert.deepEqual(plan.sessions.map((s) => s.offset), [1, 3, 5, 7])
  assert.ok(plan.explanation.some((line) => line.includes('steps up to Hard')))
})

test('high average alone does not step up when the last three include a dip', () => {
  const plan = forecast([
    session(1, 95, { difficulty: 'medium' }),
    session(2, 92, { difficulty: 'medium' }),
    session(3, 79, { difficulty: 'medium' }),
    session(4, 90, { difficulty: 'medium' }),
    session(5, 90, { difficulty: 'medium' }),
  ])

  assert.equal(plan.recentAverage, 89)
  assert.equal(plan.difficulty.key, 'medium')
  assert.equal(plan.sessionCount, 3)
  assert.equal(plan.predictedAccuracy, 89)
})

test('a rough patch steps down and keeps the week short', () => {
  const plan = forecast([
    session(1, 50, { difficulty: 'medium' }),
    session(2, 55, { difficulty: 'medium' }),
    session(3, 45, { difficulty: 'medium' }),
    session(4, 60, { difficulty: 'medium' }),
    session(5, 40, { difficulty: 'medium' }),
  ])

  assert.equal(plan.recentAverage, 50)
  assert.equal(plan.predictedAccuracy, 50)
  assert.equal(plan.outcomeLabel, 'Likely challenging')
  assert.equal(plan.difficulty.key, 'easy')
  assert.equal(plan.sessionCount, 2)
  assert.equal(plan.durationMin, 5)
  assert.deepEqual(plan.sessions.map((s) => s.offset), [1, 3])
})

test('per-gesture accuracy uses only the last three sessions with data', () => {
  const full = { pinch: { hits: 9, misses: 1 }, fist: { hits: 9, misses: 1 }, palm: { hits: 9, misses: 1 } }
  const sessions = [
    session(1, 80, {
      gestureStats: {
        pinch: { hits: 1, misses: 9 },
        fist: { hits: 1, misses: 9 },
        palm: { hits: 9, misses: 1 },
      },
    }),
    session(2, 80, { gestureStats: full }),
    session(3, 80, { gestureStats: full }),
    session(4, 80, {
      gestureStats: {
        pinch: { hits: 0, misses: 100 },
        fist: { hits: 0, misses: 100 },
        palm: { hits: 0, misses: 100 },
      },
    }),
  ]

  const gesturePerformance = getGesturePerformance(sessions)
  assert.equal(gesturePerformance[0].accuracy, 63)
  assert.equal(gesturePerformance[0].attempts, 30)
  assert.equal(gesturePerformance[0].sessions, 3)
  assert.equal(gesturePerformance[2].accuracy, 90)

  const plan = forecast(sessions)
  assert.deepEqual(plan.focus.map((g) => g.gesture), ['pinch', 'fist'])
  assert.equal(plan.sessions[0].focusGesture, 'pinch')
  assert.equal(plan.sessions[1].focusGesture, 'fist')
  assert.ok(plan.explanation.some((line) => line.includes('Pinch')))
})

test('plan dates land on the next seven days with sessions on alternating days', () => {
  const plan = forecast([session(1, 75, { difficulty: 'easy' })])
  assert.deepEqual(plan.days.map((d) => planDateOffset(d.dateISO, NOW)), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(plan.days.filter((d) => d.isSessionDay).length, 3)
  assert.equal(plan.days[1].isSessionDay, false)
  assert.equal(plan.days[1].session, null)
})
