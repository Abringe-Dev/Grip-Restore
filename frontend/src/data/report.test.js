import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_REPORT_RANGE,
  REPORT_RANGES,
  buildReport,
  filterSessionsByRange,
  filterSessionsByWeeks,
  getGestureTotals,
  getMissInsights,
  getWeeklyOutcomes,
  summarizeSessions,
} from './report.js'

const NOW = new Date(2026, 10, 10, 12, 0, 0)

function daysAgo(days, overrides = {}) {
  const date = new Date(NOW)
  date.setDate(date.getDate() - days)
  return {
    id: `session-${days}`,
    dateISO: date.toISOString(),
    durationMin: 5,
    hits: 8,
    misses: 2,
    accuracy: 80,
    ...overrides,
  }
}

test('report ranges filter sessions by the selected window', () => {
  const sessions = [0, 6, 7, 29, 30].map((days) => daysAgo(days))

  assert.equal(filterSessionsByRange(sessions, '7d', NOW).length, 2)
  assert.deepEqual(
    filterSessionsByRange(sessions, '7d', NOW).map((row) => row.id),
    ['session-0', 'session-6'],
  )
  assert.equal(filterSessionsByRange(sessions, '30d', NOW).length, 4)
  assert.equal(filterSessionsByRange(sessions, 'all', NOW).length, 5)
  assert.equal(REPORT_RANGES.some((range) => range.key === DEFAULT_REPORT_RANGE), true)
})

test('seven-week filtering includes the current ISO week and previous six', () => {
  const firstIncluded = daysAgo(0, {
    id: 'first',
    dateISO: new Date(2026, 8, 28, 0, 0, 0).toISOString(),
  })
  const excluded = daysAgo(0, {
    id: 'excluded',
    dateISO: new Date(2026, 8, 27, 23, 59, 0).toISOString(),
  })

  assert.deepEqual(
    filterSessionsByWeeks([firstIncluded, excluded], 7, NOW).map((row) => row.id),
    ['first'],
  )
})

test('summary totals sessions, minutes, counters, accuracy, days, and streak', () => {
  const summary = summarizeSessions([
    daysAgo(0, { durationMin: 5, hits: 8, misses: 2, accuracy: 80 }),
    daysAgo(1, { durationMin: 10, hits: 4, misses: 6, accuracy: 40 }),
  ])

  assert.equal(summary.sessionCount, 2)
  assert.equal(summary.totalMinutes, 15)
  assert.equal(summary.hits, 12)
  assert.equal(summary.misses, 8)
  assert.equal(summary.attempts, 20)
  assert.equal(summary.accuracy, 60)
  assert.equal(summary.hasCounters, true)
  assert.equal(summary.activeDays, 2)
  assert.equal(summary.bestStreak, 2)
})

test('summary supports legacy rows without counters', () => {
  const summary = summarizeSessions([
    {
      id: 'legacy',
      dateISO: NOW.toISOString(),
      durationMin: 5,
      accuracy: 70,
    },
  ])

  assert.equal(summary.sessionCount, 1)
  assert.equal(summary.hasCounters, false)
  assert.equal(summary.attempts, 0)
  assert.equal(summary.accuracy, 70)
})

test('gesture totals aggregate each grip and ignore malformed entries', () => {
  const rows = [
    daysAgo(0, {
      gestureStats: {
        pinch: { hits: 5, misses: 1 },
        fist: { hits: 2, misses: 3 },
        palm: { hits: 1, misses: 0 },
      },
    }),
    daysAgo(1, {
      gestureStats: {
        pinch: { hits: 3, misses: 2 },
        fist: { hits: 1, misses: 0 },
        palm: { hits: 4, misses: 1 },
        wrist: { hits: 99, misses: 99 },
      },
    }),
  ]

  const totals = getGestureTotals(rows)
  const byKey = Object.fromEntries(totals.map((gesture) => [gesture.key, gesture]))

  assert.deepEqual(
    totals.map(({ key, hits, misses, attempts }) => ({ key, hits, misses, attempts })),
    [
      { key: 'pinch', hits: 8, misses: 3, attempts: 11 },
      { key: 'fist', hits: 3, misses: 3, attempts: 6 },
      { key: 'palm', hits: 5, misses: 1, attempts: 6 },
    ],
  )
  assert.equal(byKey.pinch.accuracy, 73)
  assert.equal(byKey.pinch.missShare, 43)
  assert.equal(byKey.palm.missShare, 14)
})

test('weekly outcomes sum hits and misses into the current seven week buckets', () => {
  const data = getWeeklyOutcomes([
    daysAgo(0, { hits: 6, misses: 2, gestureStats: {} }),
    daysAgo(1, {
      hits: null,
      misses: null,
      gestureStats: {
        pinch: { hits: 2, misses: 1 },
        fist: { hits: 1, misses: 0 },
        palm: { hits: 0, misses: 1 },
      },
    }),
  ], NOW)

  const current = data[data.length - 1]
  assert.equal(data.length, 7)
  assert.equal(current.sessions, 2)
  assert.equal(current.hits, 9)
  assert.equal(current.misses, 4)
  assert.equal(current.attempted, 13)
})

test('miss insights identify the most missed grip', () => {
  const insights = getMissInsights([
    daysAgo(0, {
      gestureStats: {
        pinch: { hits: 1, misses: 6 },
        fist: { hits: 8, misses: 1 },
        palm: { hits: 4, misses: 2 },
      },
    }),
  ])

  assert.equal(insights.totalMisses, 9)
  assert.equal(insights.totalAttempts, 22)
  assert.equal(insights.missRate, 41)
  assert.equal(insights.mostMissed.key, 'pinch')
  assert.equal(insights.mostMissed.misses, 6)
})

test('buildReport adds the previous-period comparison and forecast', () => {
  const report = buildReport([
    daysAgo(1, { accuracy: 80, hits: 8, misses: 2, gestureStats: { pinch: { hits: 5, misses: 1 } } }),
    daysAgo(35, { accuracy: 60, hits: 6, misses: 4, gestureStats: { fist: { hits: 3, misses: 3 } } }),
  ], '30d', NOW)

  assert.equal(report.summary.sessionCount, 1)
  assert.equal(report.previousSummary.sessionCount, 1)
  assert.equal(report.summary.accuracy, 80)
  assert.equal(report.previousSummary.accuracy, 60)
  assert.equal(report.accuracyChange, 20)
  assert.equal(report.forecast.hasData, true)
  assert.equal(report.missInsights.totalMisses, 1)
})

test('all-time reports have no previous-period comparison', () => {
  const report = buildReport([daysAgo(1)], 'all', NOW)

  assert.equal(report.summary.sessionCount, 1)
  assert.equal(report.previousSummary.sessionCount, 0)
  assert.equal(report.accuracyChange, null)
})
