import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPracticeState,
  practicePercent,
  shouldSuggestSession,
  tickPractice,
} from './practiceEngine.js'
import { PRACTICE_CONFIG } from './practiceConfig.js'

function run(state, gesture, ticks, step = PRACTICE_CONFIG.tickMs) {
  let current = state
  let lastEvent = null
  for (let i = 0; i < ticks; i += 1) {
    const result = tickPractice(current, gesture, step)
    current = result.state
    if (result.event) lastEvent = result.event
  }
  return { state: current, event: lastEvent }
}

test('practice begins idle and reports wrong gestures as almost', () => {
  let state = createPracticeState('pinch')
  assert.equal(state.status, 'not-detected')
  assert.equal(state.attempts, 0)

  state = tickPractice(state, 'none', PRACTICE_CONFIG.tickMs).state
  assert.equal(state.status, 'not-detected')

  state = tickPractice(state, 'fist', PRACTICE_CONFIG.tickMs).state
  assert.equal(state.status, 'almost')
  assert.equal(state.attempts, 0, 'no attempt until the target is acquired')
})

test('holding the target for two seconds succeeds exactly once', () => {
  const start = tickPractice(createPracticeState('pinch'), 'pinch', PRACTICE_CONFIG.tickMs).state
  assert.equal(start.status, 'correct')
  assert.equal(start.attemptActive, true)
  assert.equal(practicePercent(start), 5)

  const held = run(start, 'pinch', 19)
  assert.equal(held.event.type, 'success')
  assert.equal(held.state.heldMs, PRACTICE_CONFIG.holdMs)
  assert.equal(held.state.attempts, 1)
  assert.equal(held.state.successes, 1)
  assert.equal(held.state.currentStreak, 1)
  assert.equal(held.state.bestStreak, 1)
  assert.equal(held.state.awaitingRelease, true)

  const stillHeld = run(held.state, 'pinch', 5)
  assert.equal(stillHeld.event, null, 'holding after success does not count again')
  assert.equal(stillHeld.state.attempts, 1)
})

test('early release records a failure and resets the current streak', () => {
  let state = run(createPracticeState('fist'), 'fist', 20).state
  state = run(state, 'none', 1).state
  assert.equal(state.currentStreak, 1)

  const reacquired = run(state, 'fist', 5).state
  assert.equal(reacquired.heldMs, 500)
  const released = tickPractice(reacquired, 'none', PRACTICE_CONFIG.tickMs)

  assert.equal(released.event.type, 'failure')
  assert.equal(released.state.attempts, 2)
  assert.equal(released.state.successes, 1)
  assert.equal(released.state.currentStreak, 0)
  assert.equal(released.state.bestStreak, 1)
  assert.equal(released.state.status, 'not-detected')
})

test('a wrong gesture mid-hold also fails the attempt', () => {
  const held = run(createPracticeState('palm'), 'palm', 4).state
  const wrong = tickPractice(held, 'pinch', PRACTICE_CONFIG.tickMs)
  assert.equal(wrong.event.type, 'failure')
  assert.equal(wrong.state.status, 'almost')
  assert.equal(wrong.state.attempts, 1)
})

test('after success the gesture must be released before a new attempt', () => {
  let state = run(createPracticeState('pinch'), 'pinch', 20).state
  state = tickPractice(state, 'none', PRACTICE_CONFIG.tickMs).state
  assert.equal(state.awaitingRelease, false)

  const next = tickPractice(state, 'pinch', PRACTICE_CONFIG.tickMs)
  assert.equal(next.state.attemptActive, true)
  assert.equal(next.state.heldMs, 100)
})

test('three consecutive successes trigger the play-session suggestion', () => {
  let state = createPracticeState('pinch')
  for (let i = 0; i < 3; i += 1) {
    state = run(state, 'pinch', 20).state
    state = run(state, 'none', 1).state
  }
  assert.equal(state.currentStreak, 3)
  assert.equal(shouldSuggestSession(state), true)

  const failed = tickPractice(run(state, 'pinch', 1).state, 'none', PRACTICE_CONFIG.tickMs).state
  assert.equal(failed.currentStreak, 0)
  assert.equal(shouldSuggestSession(failed), false)
})
