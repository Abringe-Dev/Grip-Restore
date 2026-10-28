import { Router } from 'express'
import { newId } from '../auth/tokens.js'
import { createSessionSchema } from '../validation/schemas.js'
import { validate } from '../middleware/validate.js'

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function mapSessionRow(row) {
  return {
    id: row.id,
    dateISO: row.created_at,
    durationMin: row.duration_min,
    difficulty: row.difficulty,
    hits: row.hits,
    misses: row.misses,
    accuracy: row.accuracy,
    gesture: row.gesture,
    gestures: parseJson(row.gestures, []),
    gestureStats: parseJson(row.gesture_stats, {}),
    calibration: parseJson(row.calibration, null),
  }
}

export function createSessionsRouter({ db, requireAuth }) {
  const router = Router()
  router.use(requireAuth)

  router.get('/', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM game_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1000')
      .all(req.user.id)
    res.json(rows.map(mapSessionRow))
  })

  router.post('/', validate(createSessionSchema), (req, res) => {
    const {
      durationMin,
      difficulty,
      hits,
      misses,
      gesture,
      gestures,
      gestureStats,
      calibration,
    } = req.valid
    const hitCount = hits == null ? null : hits
    const missCount = misses == null ? null : misses
    const attempted = (hitCount ?? 0) + (missCount ?? 0)
    // Never trust a client-computed accuracy; derive it from the counters.
    const accuracy = attempted > 0 ? Math.round(((hitCount ?? 0) * 100) / attempted) : 0

    const id = newId()
    const createdAt = new Date().toISOString()
    db.prepare(
      `INSERT INTO game_sessions
        (id, user_id, duration_min, difficulty, hits, misses, accuracy, gesture, gestures,
         gesture_stats, calibration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      req.user.id,
      durationMin,
      difficulty ?? '',
      hitCount,
      missCount,
      accuracy,
      String(gesture ?? 'Mixed'),
      JSON.stringify(Array.isArray(gestures) ? gestures : []),
      JSON.stringify(gestureStats ?? {}),
      calibration == null ? null : JSON.stringify(calibration),
      createdAt,
    )

    const row = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id)
    res.status(201).json(mapSessionRow(row))
  })

  return router
}
