import test from 'node:test'
import assert from 'node:assert/strict'
import { getSessionHistory, loadSessions, saveSession, sessionsKey } from './sessionStore.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  }
}

function withStorage(t) {
  const original = globalThis.localStorage
  globalThis.localStorage = createStorage()
  t.after(() => {
    globalThis.localStorage = original
  })
}

test('saveSession persists difficulty, hits, and misses', (t) => {
  withStorage(t)

  const sessions = saveSession('Player@Example.com', {
    durationMin: 5,
    gesture: 'Mixed',
    gestures: ['Pinch', 'Fist', 'Open Palm'],
    accuracy: 80,
    difficulty: 'medium',
    hits: 8,
    misses: 2,
  })

  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].difficulty, 'medium')
  assert.equal(sessions[0].hits, 8)
  assert.equal(sessions[0].misses, 2)

  const history = getSessionHistory(sessions)
  assert.equal(history[0].mode, 'Medium')
  assert.equal(history[0].hits, 8)
  assert.equal(history[0].misses, 2)
})

test('history stays compatible with sessions saved before gameplay scoring', (t) => {
  withStorage(t)

  const oldSession = {
    id: 'old-session',
    dateISO: new Date().toISOString(),
    durationMin: 5,
    gesture: 'Pinch',
    gestures: ['Pinch'],
    accuracy: 90,
    calibration: null,
  }
  globalThis.localStorage.setItem(sessionsKey('old@example.com'), JSON.stringify([oldSession]))

  const sessions = loadSessions('old@example.com')
  assert.equal(sessions.length, 1)

  const history = getSessionHistory(sessions)
  assert.equal(history[0].mode, 'Pinch')
  assert.equal(history[0].hits, null)
  assert.equal(history[0].misses, null)
  assert.equal(history[0].accuracy, 90)
})
