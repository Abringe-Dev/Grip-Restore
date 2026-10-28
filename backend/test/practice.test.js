import test from 'node:test'
import assert from 'node:assert/strict'
import { createVerifiedUser, startTestServer } from './helpers.js'

test('practice progress requires auth and starts zero-filled for every gesture', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const anonymous = await ctx.request('/api/practice')
  assert.equal(anonymous.status, 401)

  const user = await createVerifiedUser(ctx, { email: 'practice-empty@example.com' })
  const res = await ctx.request('/api/practice', { cookie: user.cookie })

  assert.equal(res.status, 200)
  assert.deepEqual(
    res.data.map((row) => row.gesture),
    ['pinch', 'fist', 'palm'],
  )
  for (const row of res.data) {
    assert.equal(row.attempts, 0)
    assert.equal(row.successes, 0)
    assert.equal(row.accuracy, 0)
    assert.equal(row.currentStreak, 0)
    assert.equal(row.bestStreak, 0)
    assert.equal(row.updatedAt, null)
  }
})

test('attempts update accuracy and streaks, and failures reset the current streak', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const user = await createVerifiedUser(ctx, { email: 'practice-streak@example.com' })
  const post = (success, gesture = 'pinch') =>
    ctx.request('/api/practice/attempts', {
      method: 'POST',
      cookie: user.cookie,
      body: { gesture, success },
    })

  const first = await post(true)
  assert.equal(first.status, 201)
  assert.equal(first.data.attempts, 1)
  assert.equal(first.data.successes, 1)
  assert.equal(first.data.accuracy, 100)
  assert.equal(first.data.currentStreak, 1)
  assert.equal(first.data.bestStreak, 1)

  const second = await post(true)
  assert.equal(second.data.currentStreak, 2)
  assert.equal(second.data.bestStreak, 2)

  const failed = await post(false)
  assert.equal(failed.data.attempts, 3)
  assert.equal(failed.data.successes, 2)
  assert.equal(failed.data.accuracy, 67)
  assert.equal(failed.data.currentStreak, 0)
  assert.equal(failed.data.bestStreak, 2, 'best streak survives a miss')

  const list = await ctx.request('/api/practice', { cookie: user.cookie })
  const pinch = list.data.find((row) => row.gesture === 'pinch')
  assert.equal(pinch.attempts, 3)
  assert.equal(pinch.successes, 2)
  assert.equal(pinch.bestStreak, 2)
})

test('practice attempts are validated and scoped per user', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const alice = await createVerifiedUser(ctx, { email: 'practice-alice@example.com' })
  const bob = await createVerifiedUser(ctx, { email: 'practice-bob@example.com' })

  const invalid = [
    { gesture: 'wrist', success: true },
    { gesture: 'pinch', success: 'true' },
    { gesture: 'pinch', success: true, extra: 1 },
    { success: true },
  ]
  for (const body of invalid) {
    const res = await ctx.request('/api/practice/attempts', {
      method: 'POST',
      cookie: alice.cookie,
      body,
    })
    assert.equal(res.status, 400, `rejected payload ${JSON.stringify(body)}`)
  }

  await ctx.request('/api/practice/attempts', {
    method: 'POST',
    cookie: alice.cookie,
    body: { gesture: 'fist', success: true },
  })

  const bobList = await ctx.request('/api/practice', { cookie: bob.cookie })
  assert.ok(bobList.data.every((row) => row.attempts === 0), 'users cannot see each other progress')
})
