import { Router } from 'express'
import { practiceAttemptSchema } from '../validation/schemas.js'
import { validate } from '../middleware/validate.js'
import { transaction } from '../db/index.js'

export const PRACTICE_GESTURES = ['pinch', 'fist', 'palm']

function mapPracticeRow(row, gesture) {
  const attempts = row?.attempts ?? 0
  const successes = row?.successes ?? 0
  return {
    gesture,
    attempts,
    successes,
    accuracy: attempts > 0 ? Math.round((successes * 100) / attempts) : 0,
    currentStreak: row?.current_streak ?? 0,
    bestStreak: row?.best_streak ?? 0,
    updatedAt: row?.updated_at ?? null,
  }
}

export function createPracticeRouter({ db, requireAuth }) {
  const router = Router()
  router.use(requireAuth)

  router.get('/', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM practice_progress WHERE user_id = ?')
      .all(req.user.id)
    const byGesture = new Map(rows.map((row) => [row.gesture, row]))
    res.json(PRACTICE_GESTURES.map((gesture) => mapPracticeRow(byGesture.get(gesture), gesture)))
  })

  router.post('/attempts', validate(practiceAttemptSchema), (req, res) => {
    const { gesture, success } = req.valid
    const updatedAt = new Date().toISOString()

    const record = transaction(db, () => {
      const existing = db
        .prepare('SELECT * FROM practice_progress WHERE user_id = ? AND gesture = ?')
        .get(req.user.id, gesture)
      const attempts = (existing?.attempts ?? 0) + 1
      const successes = (existing?.successes ?? 0) + (success ? 1 : 0)
      const currentStreak = success ? (existing?.current_streak ?? 0) + 1 : 0
      const bestStreak = Math.max(existing?.best_streak ?? 0, currentStreak)

      db.prepare(
        `INSERT INTO practice_progress
          (user_id, gesture, attempts, successes, current_streak, best_streak, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, gesture) DO UPDATE SET
           attempts = excluded.attempts,
           successes = excluded.successes,
           current_streak = excluded.current_streak,
           best_streak = excluded.best_streak,
           updated_at = excluded.updated_at`,
      ).run(req.user.id, gesture, attempts, successes, currentStreak, bestStreak, updatedAt)

      return db
        .prepare('SELECT * FROM practice_progress WHERE user_id = ? AND gesture = ?')
        .get(req.user.id, gesture)
    })

    res.status(201).json(mapPracticeRow(record, gesture))
  })

  return router
}
