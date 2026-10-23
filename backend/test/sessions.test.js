import test from 'node:test'
import assert from 'node:assert/strict'
import { createVerifiedUser, startTestServer } from './helpers.js'

test('game sessions require authentication and are scoped per user', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const anonymous = await ctx.request('/api/sessions')
  assert.equal(anonymous.status, 401)

  const alice = await createVerifiedUser(ctx, { email: 'alice@example.com' })
  const bob = await createVerifiedUser(ctx, { email: 'bob@example.com' })

  const created = await ctx.request('/api/sessions', {
    method: 'POST',
    cookie: alice.cookie,
    body: {
      durationMin: 5,
      difficulty: 'medium',
      hits: 8,
      misses: 2,
      accuracy: 1,
      gesture: 'Mixed',
      gestures: ['Pinch', 'Fist', 'Open Palm'],
      calibration: [{ gesture: 'pinch', heldMs: 2000 }],
    },
  })
  assert.equal(created.status, 201)
  assert.equal(created.data.accuracy, 80, 'server recomputes accuracy from hits/misses')
  assert.equal(created.data.difficulty, 'medium')
  assert.equal(created.data.calibration[0].gesture, 'pinch')

  await ctx.request('/api/sessions', {
    method: 'POST',
    cookie: alice.cookie,
    body: { durationMin: 10, difficulty: 'hard', hits: 0, misses: 4 },
  })

  const aliceList = await ctx.request('/api/sessions', { cookie: alice.cookie })
  assert.equal(aliceList.status, 200)
  assert.equal(aliceList.data.length, 2)
  assert.equal(aliceList.data[0].durationMin, 10, 'newest first')

  const bobList = await ctx.request('/api/sessions', { cookie: bob.cookie })
  assert.equal(bobList.status, 200)
  assert.equal(bobList.data.length, 0, 'users cannot see each other sessions')
})

test('session payloads are validated', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const user = await createVerifiedUser(ctx, { email: 'validate@example.com' })

  const cases = [
    { durationMin: 0, hits: 1, misses: 0 },
    { durationMin: 5, hits: -1, misses: 0 },
    { durationMin: 5, difficulty: 'impossible' },
    { durationMin: 5, unexpected: true },
    { hits: 1, misses: 0 },
  ]

  for (const body of cases) {
    const res = await ctx.request('/api/sessions', { method: 'POST', cookie: user.cookie, body })
    assert.equal(res.status, 400, `rejected payload ${JSON.stringify(body)}`)
  }
})

test('stored session timestamps drive history ordering', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const user = await createVerifiedUser(ctx, { email: 'order@example.com' })
  const first = await ctx.request('/api/sessions', {
    method: 'POST',
    cookie: user.cookie,
    body: { durationMin: 5, hits: 5, misses: 5 },
  })
  const second = await ctx.request('/api/sessions', {
    method: 'POST',
    cookie: user.cookie,
    body: { durationMin: 10, hits: 9, misses: 1 },
  })

  assert.equal(first.data.dateISO, new Date(first.data.dateISO).toISOString())
  assert.ok(second.data.dateISO >= first.data.dateISO)

  const list = await ctx.request('/api/sessions', { cookie: user.cookie })
  assert.deepEqual(
    list.data.map((row) => row.id),
    [second.data.id, first.data.id],
  )
})
