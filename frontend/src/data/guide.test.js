import test from 'node:test'
import assert from 'node:assert/strict'
import { guideSeenKey, hasSeenGuide, markGuideSeen } from './guide.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

test('guide seen state is namespaced per user', () => {
  assert.equal(guideSeenKey('user-1'), 'grip-restore:guide-seen:user-1')
  assert.equal(guideSeenKey(''), '')

  const storage = memoryStorage()
  assert.equal(hasSeenGuide('user-1', storage), false)
  assert.equal(markGuideSeen('user-1', storage), true)
  assert.equal(hasSeenGuide('user-1', storage), true)
  assert.equal(hasSeenGuide('user-2', storage), false)
})

test('guide storage failures fall back to showing the guide', () => {
  const broken = {
    getItem: () => { throw new Error('blocked') },
    setItem: () => { throw new Error('blocked') },
  }
  assert.equal(hasSeenGuide('user-1', broken), false)
  assert.equal(markGuideSeen('user-1', broken), false)
  assert.equal(hasSeenGuide(null, memoryStorage()), false)
})
