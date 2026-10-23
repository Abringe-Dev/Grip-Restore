import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  GAME_TICK_MS,
  HIT_LINE_PROGRESS,
  LEAD_IN_MS,
  createNoteSchedule,
  difficultyByKey,
  hasNoteMissed,
  hitBandPercent,
  isNoteHittable,
  isNoteVisible,
  noteProgress,
  resolveDifficulty,
  summarizeGame,
} from './fallingGame.js'
import { GESTURES } from './session.js'

const GESTURE_KEYS = GESTURES.map((g) => g.key)
const FIXED_RNG = () => 0.5

function makeNote(overrides = {}) {
  return {
    id: 'note-test',
    gesture: 'pinch',
    spawnAtMs: 1000,
    hitAtMs: 2000,
    bottomAtMs: 3000,
    ...overrides,
  }
}

test('resolveDifficulty falls back to the default', () => {
  assert.equal(resolveDifficulty('hard').key, 'hard')
  assert.equal(resolveDifficulty('unknown').key, DEFAULT_DIFFICULTY)
  assert.equal(resolveDifficulty(undefined).key, DEFAULT_DIFFICULTY)
  assert.equal(difficultyByKey('missing'), null)
})

test('difficulties get faster, denser, and stricter', () => {
  const easy = difficultyByKey('easy')
  const medium = difficultyByKey('medium')
  const hard = difficultyByKey('hard')

  assert.ok(easy.fallMs > medium.fallMs)
  assert.ok(medium.fallMs > hard.fallMs)
  assert.ok(easy.minGapMs > medium.minGapMs)
  assert.ok(medium.minGapMs > hard.minGapMs)
  assert.ok(easy.hitWindowMs > medium.hitWindowMs)
  assert.ok(medium.hitWindowMs > hard.hitWindowMs)
  assert.deepEqual(DIFFICULTIES.map((d) => d.key), ['easy', 'medium', 'hard'])
})

test('hit band stays a consistent share of the lane', () => {
  for (const difficulty of DIFFICULTIES) {
    assert.equal(Math.round(hitBandPercent(difficulty)), 20)
  }
})

test('schedule starts after the lead-in and never repeats a gesture', () => {
  const difficulty = difficultyByKey('medium')
  const durationMs = 60000
  const notes = createNoteSchedule({ difficulty: difficulty.key, durationMs, rng: FIXED_RNG })

  assert.ok(notes.length > 0)
  assert.equal(notes[0].spawnAtMs, LEAD_IN_MS)
  assert.equal(notes[0].hitAtMs, Math.round(LEAD_IN_MS + difficulty.fallMs * HIT_LINE_PROGRESS))

  const ids = new Set()
  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i]
    assert.ok(GESTURE_KEYS.includes(note.gesture))
    assert.ok(!ids.has(note.id))
    ids.add(note.id)
    assert.ok(note.spawnAtMs < note.hitAtMs)
    assert.ok(note.hitAtMs < note.bottomAtMs)
    assert.ok(note.hitAtMs <= durationMs)
    assert.ok(note.bottomAtMs - note.spawnAtMs === difficulty.fallMs)
    if (i > 0) {
      assert.notEqual(note.gesture, notes[i - 1].gesture)
      assert.ok(note.hitAtMs > notes[i - 1].hitAtMs)
      const gap = note.hitAtMs - notes[i - 1].hitAtMs
      assert.ok(gap >= difficulty.minGapMs - 1)
      assert.ok(gap <= difficulty.maxGapMs + 1)
    }
  }
})

test('schedule is empty when the session is shorter than the lead-in', () => {
  assert.deepEqual(createNoteSchedule({ difficulty: 'easy', durationMs: 100, rng: FIXED_RNG }), [])
})

test('noteProgress tracks spawn to bottom and clamps', () => {
  const note = makeNote()
  assert.equal(noteProgress(note, 500), 0)
  assert.equal(noteProgress(note, 1000), 0)
  assert.equal(noteProgress(note, 2000), 0.5)
  assert.equal(noteProgress(note, 3000), 1)
  assert.equal(noteProgress(note, 4000), 1)
  assert.equal(noteProgress(null, 1000), 0)
})

test('isNoteVisible respects the spawn and bottom bounds', () => {
  const note = makeNote()
  assert.equal(isNoteVisible(note, 999), false)
  assert.equal(isNoteVisible(note, 1000), true)
  assert.equal(isNoteVisible(note, 3000), true)
  assert.equal(isNoteVisible(note, 3001), false)
  assert.equal(isNoteVisible(null, 2000), false)
})

test('isNoteHittable uses the inclusive timing window', () => {
  const note = makeNote()
  assert.equal(isNoteHittable(note, 1800, 200), true)
  assert.equal(isNoteHittable(note, 1799, 200), false)
  assert.equal(isNoteHittable(note, 2200, 200), true)
  assert.equal(isNoteHittable(note, 2201, 200), false)
  assert.equal(isNoteHittable(note, 2000, 0), true)
  assert.equal(isNoteHittable(note, 2001, 0), false)
})

test('hasNoteMissed only fires after the window closes', () => {
  const note = makeNote()
  assert.equal(hasNoteMissed(note, 2200, 200), false)
  assert.equal(hasNoteMissed(note, 2201, 200), true)
  assert.equal(hasNoteMissed(note, 1800, 200), false)
})

test('summarizeGame counts hits, misses, and accuracy', () => {
  assert.deepEqual(summarizeGame(3, 1), { hits: 3, misses: 1, attempted: 4, accuracy: 75 })
  assert.deepEqual(summarizeGame(0, 0), { hits: 0, misses: 0, attempted: 0, accuracy: 0 })
  assert.deepEqual(summarizeGame(-2, 1.8), { hits: 0, misses: 1, attempted: 1, accuracy: 0 })
  assert.deepEqual(summarizeGame('4', '4'), { hits: 4, misses: 4, attempted: 8, accuracy: 50 })
})

test('game tick is fast enough to catch the hard window', () => {
  const hard = difficultyByKey('hard')
  assert.ok(GAME_TICK_MS < hard.hitWindowMs)
})
