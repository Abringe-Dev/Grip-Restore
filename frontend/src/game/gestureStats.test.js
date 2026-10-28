import test from 'node:test'
import assert from 'node:assert/strict'
import { createGestureStats, recordGestureResult } from './gestureStats.js'

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
