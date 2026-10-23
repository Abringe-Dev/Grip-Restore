export const SESSION_DURATIONS = [5, 10]
export const DEFAULT_DURATION_MIN = 5

// Keys match classifyGesture() output ('pinch' | 'fist' | 'palm').
export const GESTURES = [
  { key: 'pinch', label: 'Pinch', emoji: '🤏🏻', color: '#5B8DEF', glow: 'blue' },
  { key: 'fist', label: 'Fist', emoji: '✊🏻', color: '#8175D5', glow: 'purple' },
  { key: 'palm', label: 'Open Palm', emoji: '🖐🏻', color: '#3FAE7A', glow: 'green' },
]

export const GESTURE_LABELS = GESTURES.map((g) => g.label)

export function gestureByKey(key) {
  return GESTURES.find((g) => g.key === key) ?? null
}

// One rng draw per call, choosing among the gestures that are not `prev`.
// Unknown/absent `prev` falls back to the full set.
export function pickNextGesture(prev, rng = Math.random) {
  const keys = GESTURES.map((g) => g.key)
  const pool = keys.filter((k) => k !== prev)
  const candidates = pool.length > 0 ? pool : keys
  const draw = rng()
  const value = Number.isFinite(draw) ? draw : 0
  const index = Math.min(candidates.length - 1, Math.max(0, Math.floor(value * candidates.length)))
  return candidates[index]
}

// Quit-path duration: rounds wall-clock elapsed up to the nearest whole minute,
// with a 1-minute floor so every saved quit row reads as a real session.
export function elapsedToDurationMin(elapsedMs) {
  const ms = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0
  return Math.max(1, Math.round(ms / 60000))
}
