import test from 'node:test'
import assert from 'node:assert/strict'
import { createGestureStats, recordGestureResult, summarizeGestureStats } from './gestureStats.js'

test('gesture stats start at zero for every lane', () => {
  assert.deepEqual(createGestureStats(), {
    pinch: { hits: 0, misses: 0 },
    fist: { hits: 0, misses: 0 },
    palm: { hits: 0, misses: 0 },
  })
})

test('recordGestureResult counts hits and misses immutably', () => {
  const start = createGestureStats()
  const withHit = recordGestureResult(start, 'pinch', 'hit')
  const withBoth = recordGestureResult(withHit, 'pinch', 'miss')
  const withFist = recordGestureResult(withBoth, 'fist', 'hit')

  assert.deepEqual(start.pinch, { hits: 0, misses: 0 }, 'original object is untouched')
  assert.deepEqual(withBoth.pinch, { hits: 1, misses: 1 })
  assert.deepEqual(withFist.fist, { hits: 1, misses: 0 })
  assert.equal(withFist.pinch.hits, 1)
})

test('recordGestureResult ignores unknown lanes, results, and stats', () => {
  const stats = createGestureStats()
  assert.equal(recordGestureResult(stats, 'wrist', 'hit'), stats)
  assert.equal(recordGestureResult(stats, 'pinch', 'almost'), stats)
  assert.equal(recordGestureResult(null, 'pinch', 'hit'), null)
})

test('summarizeGestureStats returns attempted lanes in game order', () => {
  const summary = summarizeGestureStats({
    palm: { hits: 2, misses: 1 },
    pinch: { hits: 10, misses: 5 },
    fist: { hits: 0, misses: 0 },
    wrist: { hits: 9, misses: 9 },
  })

  assert.deepEqual(
    summary.map(({ key, label, hits, misses, attempts }) => ({ key, label, hits, misses, attempts })),
    [
      { key: 'pinch', label: 'Pinch', hits: 10, misses: 5, attempts: 15 },
      { key: 'palm', label: 'Open Palm', hits: 2, misses: 1, attempts: 3 },
    ],
  )
  assert.equal(summary[0].emoji, '🤏🏻')
  assert.equal(summary[0].color, '#5B8DEF')
})

test('summarizeGestureStats normalizes bad values and ignores legacy stats', () => {
  assert.deepEqual(summarizeGestureStats(null), [])
  assert.deepEqual(summarizeGestureStats({}), [])
  assert.deepEqual(summarizeGestureStats([]), [])
  assert.deepEqual(
    summarizeGestureStats({ pinch: { hits: -2, misses: '3' } })
      .map(({ key, hits, misses, attempts }) => ({ key, hits, misses, attempts })),
    [{ key: 'pinch', hits: 0, misses: 3, attempts: 3 }],
  )
  assert.deepEqual(summarizeGestureStats({ fist: { hits: 'x', misses: null } }), [])
  assert.deepEqual(summarizeGestureStats({ fist: null, palm: 'bad' }), [])
})
