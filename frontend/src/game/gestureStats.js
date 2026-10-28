import { GESTURES } from './session.js'

/**
 * Returns zeroed per-gesture counters in lane order:
 * { pinch: { hits, misses }, fist: { hits, misses }, palm: { hits, misses } }
 */
export function createGestureStats() {
  return Object.fromEntries(GESTURES.map(({ key }) => [key, { hits: 0, misses: 0 }]))
}

/**
 * Pure updater used by the game loop. Unknown gestures/results return the
 * same object so accidental inputs can never create a new lane.
 */
export function recordGestureResult(stats, gesture, result) {
  if (!stats || typeof stats !== 'object') return stats
  const entry = stats[gesture]
  if (!entry) return stats
  const field = result === 'hit' ? 'hits' : result === 'miss' ? 'misses' : null
  if (!field) return stats
  return {
    ...stats,
    [gesture]: {
      ...entry,
      [field]: entry[field] + 1,
    },
  }
}
