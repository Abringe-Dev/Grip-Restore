import { PRACTICE_CONFIG } from './practiceConfig.js'

/**
 * Practice attempts are only counted once they finish:
 * - acquiring the target starts the hold,
 * - reaching holdMs is a success,
 * - leaving the target early is a failure.
 * After a success the gesture must be released before another attempt starts.
 */
export function createPracticeState(target) {
  return {
    target,
    status: 'not-detected',
    heldMs: 0,
    attemptActive: false,
    awaitingRelease: false,
    attempts: 0,
    successes: 0,
    currentStreak: 0,
    bestStreak: 0,
  }
}

function statusFor(gesture) {
  return gesture && gesture !== 'none' ? 'almost' : 'not-detected'
}

/**
 * Pure tick used by the practice screen.
 * Returns { state, event }; event is null unless an attempt just completed.
 */
export function tickPractice(state, gesture, deltaMs, config = PRACTICE_CONFIG) {
  const holdMs = Math.max(1, config.holdMs ?? PRACTICE_CONFIG.holdMs)
  const step = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0
  const target = state.target
  let next = { ...state }
  let event = null

  if (next.awaitingRelease) {
    if (gesture !== target) {
      next.awaitingRelease = false
    } else {
      return { state: { ...next, status: 'correct', heldMs: holdMs }, event: null }
    }
  }

  if (gesture === target) {
    if (!next.attemptActive) {
      next.attemptActive = true
      next.heldMs = 0
    }
    next.status = 'correct'
    next.heldMs = Math.min(holdMs, next.heldMs + step)
    if (next.heldMs >= holdMs) {
      const currentStreak = next.currentStreak + 1
      next = {
        ...next,
        attemptActive: false,
        awaitingRelease: true,
        attempts: next.attempts + 1,
        successes: next.successes + 1,
        currentStreak,
        bestStreak: Math.max(next.bestStreak, currentStreak),
      }
      event = { type: 'success', gesture: target, heldMs: holdMs }
    }
  } else if (next.attemptActive) {
    event = { type: 'failure', gesture: target, heldMs: next.heldMs }
    next = {
      ...next,
      status: statusFor(gesture),
      attemptActive: false,
      heldMs: 0,
      attempts: next.attempts + 1,
      currentStreak: 0,
    }
  } else {
    next.heldMs = 0
    next.status = statusFor(gesture)
  }

  return { state: next, event }
}

export function practicePercent(state, config = PRACTICE_CONFIG) {
  const holdMs = Math.max(1, config.holdMs ?? PRACTICE_CONFIG.holdMs)
  return Math.min(100, Math.round((state.heldMs / holdMs) * 100))
}

export function shouldSuggestSession(state, config = PRACTICE_CONFIG) {
  const threshold = Math.max(1, config.suggestAfterStreak ?? PRACTICE_CONFIG.suggestAfterStreak)
  return state.currentStreak >= threshold
}
