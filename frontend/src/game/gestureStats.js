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

function toCount(value) {
  const count = Number(value)
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0
}

/**
 * Normalizes saved per-gesture stats into display rows in lane order.
 * Lanes with no attempts, unknown gestures, and malformed values are omitted,
 * so legacy sessions saved before gesture stats simply yield an empty list.
 */
export function summarizeGestureStats(stats) {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return []
  return GESTURES.flatMap(({ key, label, emoji, color }) => {
    const entry = stats[key]
    if (!entry || typeof entry !== 'object') return []
    const hits = toCount(entry.hits)
    const misses = toCount(entry.misses)
    if (hits + misses === 0) return []
    return [{ key, label, emoji, color, hits, misses, attempts: hits + misses }]
  })
}
