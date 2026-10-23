import { pickNextGesture } from './session.js'

export const READY_MS = 3000
export const GAME_TICK_MS = 50
export const HIT_LINE_PROGRESS = 0.82
export const LEAD_IN_MS = 700

export const DIFFICULTIES = [
  {
    key: 'easy',
    label: 'Easy',
    tagline: 'Relaxed pace',
    description: 'More time to see each gesture and react.',
    fallMs: 3000,
    minGapMs: 2400,
    maxGapMs: 2800,
    hitWindowMs: 300,
    color: '#3FAE7A',
  },
  {
    key: 'medium',
    label: 'Medium',
    tagline: 'Steady rhythm',
    description: 'A balanced pace for a focused workout.',
    fallMs: 2200,
    minGapMs: 1600,
    maxGapMs: 2000,
    hitWindowMs: 220,
    color: '#5B8DEF',
  },
  {
    key: 'hard',
    label: 'Hard',
    tagline: 'Fast and tight',
    description: 'Quick falls and a narrow timing window.',
    fallMs: 1600,
    minGapMs: 1100,
    maxGapMs: 1400,
    hitWindowMs: 160,
    color: '#8175D5',
  },
]

export const DEFAULT_DIFFICULTY = 'easy'

export function difficultyByKey(key) {
  return DIFFICULTIES.find((d) => d.key === key) ?? null
}

export function resolveDifficulty(value) {
  return difficultyByKey(value) ?? difficultyByKey(DEFAULT_DIFFICULTY)
}

export function hitBandPercent(config) {
  const resolved = typeof config === 'string' ? resolveDifficulty(config) : config
  if (!resolved) return 0
  return Math.min(100, (resolved.hitWindowMs / resolved.fallMs) * 200)
}

export function createNoteSchedule({ difficulty, durationMs, rng = Math.random }) {
  const config = resolveDifficulty(difficulty)
  const totalMs = Number.isFinite(Number(durationMs)) ? Math.max(0, Number(durationMs)) : 0
  const travelToHitMs = config.fallMs * HIT_LINE_PROGRESS
  const notes = []
  let previousGesture = null
  let hitAt = LEAD_IN_MS + travelToHitMs
  let index = 0

  while (hitAt <= totalMs) {
    const gesture = pickNextGesture(previousGesture, rng)
    const spawnAtMs = Math.round(hitAt - travelToHitMs)
    const hitAtMs = Math.round(hitAt)
    notes.push({
      id: `note-${index}`,
      gesture,
      spawnAtMs,
      hitAtMs,
      bottomAtMs: Math.round(spawnAtMs + config.fallMs),
    })
    previousGesture = gesture
    index += 1

    const draw = rng()
    const value = Number.isFinite(draw) ? Math.min(0.999999, Math.max(0, draw)) : 0.5
    hitAt += config.minGapMs + value * (config.maxGapMs - config.minGapMs)
  }

  return notes
}

export function noteProgress(note, elapsedMs) {
  const start = note && note.spawnAtMs
  const bottom = note && note.bottomAtMs
  if (!Number.isFinite(start) || !Number.isFinite(bottom) || bottom <= start) return 0
  const time = Number.isFinite(elapsedMs) ? elapsedMs : 0
  return Math.min(1, Math.max(0, (time - start) / (bottom - start)))
}

export function isNoteVisible(note, elapsedMs) {
  if (!note || !Number.isFinite(note.spawnAtMs) || !Number.isFinite(note.bottomAtMs)) return false
  const time = Number.isFinite(elapsedMs) ? elapsedMs : 0
  return time >= note.spawnAtMs && time <= note.bottomAtMs
}

export function isNoteHittable(note, elapsedMs, hitWindowMs) {
  if (!note || !Number.isFinite(note.hitAtMs)) return false
  const windowMs = Number.isFinite(hitWindowMs) ? Math.max(0, hitWindowMs) : 0
  const time = Number.isFinite(elapsedMs) ? elapsedMs : 0
  return Math.abs(time - note.hitAtMs) <= windowMs
}

export function hasNoteMissed(note, elapsedMs, hitWindowMs) {
  if (!note || !Number.isFinite(note.hitAtMs)) return false
  const windowMs = Number.isFinite(hitWindowMs) ? Math.max(0, hitWindowMs) : 0
  const time = Number.isFinite(elapsedMs) ? elapsedMs : 0
  return time > note.hitAtMs + windowMs
}

export function summarizeGame(hits, misses) {
  const hitCount = Number.isFinite(Number(hits)) ? Math.max(0, Math.floor(Number(hits))) : 0
  const missCount = Number.isFinite(Number(misses)) ? Math.max(0, Math.floor(Number(misses))) : 0
  const attempted = hitCount + missCount
  return {
    hits: hitCount,
    misses: missCount,
    attempted,
    accuracy: attempted > 0 ? Math.round((hitCount * 100) / attempted) : 0,
  }
}
