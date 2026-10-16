// Pure gameplay engine helpers for the /game rhythm workout.
// No DOM, timers, React, or randomness unless injected — safe to unit-test in node.

export const TICK_MS = 100
export const READY_MS = 3000
export const WINDOW_MS = 4000
export const GAP_MS = 1000
// Defensive guard for scoreWindow callers: a window with fewer than this many
// samples is dropped instead of scored. The live machine pauses its ticks
// (rather than sampling) while tracking is down, so a played window always
// collects WINDOW_MS / TICK_MS samples; this contract protects future callers.
export const MIN_WINDOW_SAMPLES = 20

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

export function createPromptGenerator(rng = Math.random) {
  let prev = null
  return {
    next() {
      prev = pickNextGesture(prev, rng)
      return prev
    },
  }
}

// samples: gesture keys (including 'none') sampled once per tick during the window.
// Strict majority required: exactly 50% is a miss. Ties at 0 hits are impossible
// once total >= minSamples, so `success` is false for empty/invalid input.
export function scoreWindow(samples, target, minSamples = MIN_WINDOW_SAMPLES) {
  const list = Array.isArray(samples) ? samples : []
  let hits = 0
  for (const sample of list) {
    if (sample === target) hits += 1
  }
  const total = list.length
  const eligible = total >= minSamples
  return {
    target,
    total,
    hits,
    ratio: total > 0 ? hits / total : 0,
    eligible,
    success: eligible && hits * 2 > total,
  }
}

// windows: Array<{ target, success }> — eligible windows only. Non-object
// entries are ignored entirely (neither attempted nor scored).
export function summarizeResults(windows) {
  const list = Array.isArray(windows) ? windows : []
  const valid = list.filter((w) => w && typeof w === 'object')
  let succeeded = 0
  const targets = []
  for (const w of valid) {
    if (w.success) succeeded += 1
    if (typeof w.target === 'string' && !targets.includes(w.target)) targets.push(w.target)
  }
  const attempted = valid.length
  const single = targets.length === 1 ? gestureByKey(targets[0]) : null
  return {
    attempted,
    succeeded,
    targets,
    accuracy: attempted > 0 ? Math.round((succeeded * 100) / attempted) : 0,
    gesture: attempted === 0 ? '' : (single ? single.label : 'Mixed'),
  }
}

// Quit-path duration: rounds wall-clock elapsed up to the nearest whole minute,
// with a 1-minute floor so every saved quit row reads as a real session.
export function elapsedToDurationMin(elapsedMs) {
  const ms = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0
  return Math.max(1, Math.round(ms / 60000))
}
