import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import WebcamCard from '../components/WebcamCard'
import { useWebcam } from '../context/useWebcam'
import { useHandTracking } from '../context/useHandTracking'
import { useAuth } from '../context/useAuth'
import { saveSession } from '../data/sessionStore'
import {
  DEFAULT_DURATION_MIN,
  GESTURES,
  GESTURE_LABELS,
  SESSION_DURATIONS,
  elapsedToDurationMin,
  gestureByKey,
} from '../game/session'
import {
  GAME_TICK_MS,
  HIT_LINE_PROGRESS,
  READY_MS,
  createNoteSchedule,
  hitBandPercent,
  noteProgress,
  resolveDifficulty,
  summarizeGame,
} from '../game/fallingGame'
import { initSounds, playFinish, playMiss, playPrompt, playSuccess, playTick } from '../game/sounds'
import './../styles/game.css'

const FEEDBACK_MS = 650
const RESULT_NAV_MS = 2600

function FallingBoard({
  notes,
  currentGesture,
  bandPercent,
  phase,
  readyCount,
  canPlay,
  pauseNote,
  feedback,
  summary,
  difficulty,
  durationMin,
}) {
  const bandTop = HIT_LINE_PROGRESS * 100 - bandPercent / 2

  return (
    <div className="game-board" aria-label="Falling gesture game">
      {GESTURES.map((gesture) => {
        const laneNotes = notes.filter((note) => note.gesture === gesture.key)
        const laneFeedback = feedback && feedback.gesture === gesture.key ? feedback.type : null

        return (
          <div
            key={gesture.key}
            className={`game-lane${laneFeedback ? ` is-${laneFeedback}` : ''}`}
            style={{ '--lane-color': gesture.color }}
          >
            <div className="game-lane-head">
              <span className="game-lane-emoji" aria-hidden="true">{gesture.emoji}</span>
              <span className="game-lane-label">{gesture.label}</span>
            </div>
            <div className="game-lane-track">
              <div
                className="game-hit-band"
                style={{ top: `${bandTop}%`, height: `${bandPercent}%` }}
                aria-hidden="true"
              />
              <div
                className={`game-target${currentGesture === gesture.key ? ' is-active' : ''}`}
                style={{ top: `${HIT_LINE_PROGRESS * 100}%` }}
                aria-hidden="true"
              >
                <span>{gesture.emoji}</span>
              </div>
              {laneNotes.map((note) => (
                <div
                  key={note.id}
                  className={`game-note${note.status === 'miss' ? ' is-missed' : ''}`}
                  style={{ top: `${note.progress * 100}%`, '--note-color': gesture.color }}
                  aria-hidden="true"
                >
                  <span>{gesture.emoji}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {feedback && phase === 'playing' && canPlay && (
        <div key={feedback.nonce} className={`game-feedback game-feedback--${feedback.type}`} role="status">
          {feedback.type === 'hit' ? 'Nice!' : 'Miss'}
        </div>
      )}

      {phase === 'ready' && canPlay && (
        <div className="game-overlay game-overlay--ready">
          <p className="game-ready-title">Get ready</p>
          <span className="game-ready-count">{readyCount}</span>
          <p className="game-overlay-hint">Hit each gesture when it reaches the target</p>
        </div>
      )}

      {phase !== 'done' && !canPlay && (
        <div className="game-overlay">
          <p className="game-overlay-title">Game paused</p>
          <p className="game-overlay-hint">{pauseNote}</p>
        </div>
      )}

      {phase === 'done' && summary && (
        <div className="game-overlay game-overlay--done">
          <span className="game-result-emoji" aria-hidden="true">🎉</span>
          <h1 className="game-title">Session complete!</h1>
          <div className="game-result-grid">
            <div className="game-result-stat">
              <span className="game-result-value">{summary.hits}</span>
              <span className="game-result-label">Hits</span>
            </div>
            <div className="game-result-stat">
              <span className="game-result-value">{summary.misses}</span>
              <span className="game-result-label">Misses</span>
            </div>
            <div className="game-result-stat">
              <span className="game-result-value">{summary.accuracy}%</span>
              <span className="game-result-label">Accuracy</span>
            </div>
          </div>
          <p className="game-sub">{difficulty.label} · {durationMin} min session</p>
        </div>
      )}
    </div>
  )
}

export default function Gameplace() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userId } = useAuth()
  const { status, stream, start } = useWebcam()
  const { trackingStatus, handsDetected, currentGesture, startTracking } = useHandTracking()

  const durationMin = SESSION_DURATIONS.includes(Number(location.state?.durationMin))
    ? Number(location.state.durationMin)
    : DEFAULT_DURATION_MIN
  const durationMs = durationMin * 60000
  const difficulty = resolveDifficulty(location.state?.difficulty)
  const calibration = location.state?.calibration ?? null
  const bandPercent = hitBandPercent(difficulty)

  const [phase, setPhase] = useState('ready')
  const [readyRemainingMs, setReadyRemainingMs] = useState(READY_MS)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [schedule, setSchedule] = useState([])
  const [resolvedNotes, setResolvedNotes] = useState({})
  const [feedback, setFeedback] = useState(null)

  const endedRef = useRef(false)
  const playingStartedRef = useRef(false)
  const readyRef = useRef(READY_MS)
  const elapsedRef = useRef(0)
  const hitsRef = useRef(0)
  const missesRef = useRef(0)
  const resolvedRef = useRef({})
  const scheduleRef = useRef([])
  const spawnedRef = useRef({})
  const lastReadyCountRef = useRef(null)
  const navigateTimerRef = useRef(0)
  const feedbackTimerRef = useRef(0)
  const feedbackNonceRef = useRef(0)

  const canPlay = status === 'active' && trackingStatus === 'active'

  useEffect(() => {
    start()
    startTracking()
    initSounds()
  }, [start, startTracking])

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current)
        navigateTimerRef.current = 0
      }
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = 0
      }
    }
  }, [])

  const handleRetry = useCallback(() => {
    start()
    startTracking()
  }, [start, startTracking])

  const showFeedback = (type, gesture) => {
    feedbackNonceRef.current += 1
    setFeedback({ type, gesture, nonce: feedbackNonceRef.current })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null)
      feedbackTimerRef.current = 0
    }, FEEDBACK_MS)
  }

  const saveCurrentSession = (sessionDurationMin) => {
    const summary = summarizeGame(hitsRef.current, missesRef.current)
    if (userId && summary.attempted > 0) {
      saveSession(userId, {
        durationMin: sessionDurationMin,
        gesture: 'Mixed',
        gestures: GESTURE_LABELS,
        accuracy: summary.accuracy,
        difficulty: difficulty.key,
        hits: summary.hits,
        misses: summary.misses,
        calibration,
      })
    }
  }

  const startPlaying = () => {
    if (playingStartedRef.current) return
    playingStartedRef.current = true
    const notes = createNoteSchedule({ difficulty: difficulty.key, durationMs })
    scheduleRef.current = notes
    setSchedule(notes)
    resolvedRef.current = {}
    spawnedRef.current = {}
    elapsedRef.current = 0
    hitsRef.current = 0
    missesRef.current = 0
    setElapsedMs(0)
    setHits(0)
    setMisses(0)
    setResolvedNotes({})
    setFeedback(null)
    setPhase('playing')
    playPrompt()
  }

  const finishSession = () => {
    if (endedRef.current) return
    endedRef.current = true
    saveCurrentSession(durationMin)
    setPhase('done')
    setFeedback(null)
    playFinish()
    navigateTimerRef.current = setTimeout(() => navigate('/history'), RESULT_NAV_MS)
  }

  const onTick = useEffectEvent(() => {
    if (endedRef.current) return

    if (phase === 'ready') {
      readyRef.current = Math.max(0, readyRef.current - GAME_TICK_MS)
      setReadyRemainingMs(readyRef.current)
      const count = Math.ceil(readyRef.current / 1000)
      if (count > 0 && count !== lastReadyCountRef.current) {
        lastReadyCountRef.current = count
        playTick()
      }
      if (readyRef.current <= 0) startPlaying()
      return
    }

    if (phase !== 'playing') return

    const now = elapsedRef.current + GAME_TICK_MS
    elapsedRef.current = now
    let newHits = 0
    let newMisses = 0
    let hitGesture = null
    let missGesture = null
    let resolvedChanged = false

    for (const note of scheduleRef.current) {
      if (resolvedRef.current[note.id]) continue

      if (!spawnedRef.current[note.id] && now >= note.spawnAtMs) {
        spawnedRef.current[note.id] = true
        playPrompt()
      }

      if (now < note.hitAtMs - difficulty.hitWindowMs) continue

      if (now > note.hitAtMs + difficulty.hitWindowMs) {
        resolvedRef.current[note.id] = 'miss'
        resolvedChanged = true
        newMisses += 1
        missGesture = note.gesture
        continue
      }

      if (currentGesture === note.gesture) {
        resolvedRef.current[note.id] = 'hit'
        resolvedChanged = true
        newHits += 1
        hitGesture = note.gesture
      }
    }

    if (newHits > 0) {
      hitsRef.current += newHits
      setHits(hitsRef.current)
    }

    if (newMisses > 0) {
      missesRef.current += newMisses
      setMisses(missesRef.current)
    }

    if (resolvedChanged) {
      setResolvedNotes({ ...resolvedRef.current })
    }

    if (newHits > 0) {
      playSuccess()
      showFeedback('hit', hitGesture)
    } else if (newMisses > 0) {
      playMiss()
      showFeedback('miss', missGesture)
    }

    setElapsedMs(now)

    if (now >= durationMs) finishSession()
  })

  useEffect(() => {
    if (!canPlay || phase === 'done') return undefined
    const id = setInterval(onTick, GAME_TICK_MS)
    return () => clearInterval(id)
  }, [canPlay, phase])

  const handleQuit = () => {
    if (endedRef.current) return
    endedRef.current = true
    saveCurrentSession(elapsedToDurationMin(elapsedRef.current))
    navigate('/history')
  }

  const visibleNotes = schedule.reduce((notes, note) => {
    const noteStatus = resolvedNotes[note.id]
    if (noteStatus === 'hit') return notes
    if (elapsedMs < note.spawnAtMs || elapsedMs > note.bottomAtMs) return notes
    notes.push({
      ...note,
      progress: noteProgress(note, elapsedMs),
      status: noteStatus ?? 'pending',
    })
    return notes
  }, [])

  const summary = summarizeGame(hits, misses)
  const remainingMs = Math.max(0, durationMs - elapsedMs)
  const sessionSeconds = Math.ceil(remainingMs / 1000)
  const clock = `${Math.floor(sessionSeconds / 60)}:${String(sessionSeconds % 60).padStart(2, '0')}`
  const progressPct = durationMs > 0 ? Math.min(100, (elapsedMs / durationMs) * 100) : 0
  const readyCount = Math.max(1, Math.ceil(readyRemainingMs / 1000))
  const currentInfo = gestureByKey(currentGesture)
  const glow = currentInfo ? currentInfo.glow : 'teal'
  const accuracy = summary.attempted > 0 ? `${summary.accuracy}%` : '—'

  let readinessNote = 'Turning on your camera…'
  if (status !== 'active') {
    if (status === 'denied') readinessNote = 'Camera access is needed to play. Allow it in your browser settings.'
    else if (status === 'unsupported') readinessNote = 'Your browser does not support camera access.'
    else if (status === 'error') readinessNote = 'Camera error — use Try again in the camera card.'
  } else if (trackingStatus !== 'active') {
    readinessNote = trackingStatus === 'error'
      ? 'Hand tracking paused — tap retry in the camera card.'
      : 'Warming up hand tracking…'
  }

  return (
    <main className="game-main">
      <div className="game-topbar">
        <div className="game-stat">
          <span className="game-stat-label">Time left</span>
          <span className="game-stat-value" role="timer">{clock}</span>
        </div>
        <div className="game-stat game-stat--hits">
          <span className="game-stat-label">Hits</span>
          <span className="game-stat-value">{hits}</span>
        </div>
        <div className="game-stat game-stat--misses">
          <span className="game-stat-label">Misses</span>
          <span className="game-stat-value">{misses}</span>
        </div>
        <div className="game-stat">
          <span className="game-stat-label">Accuracy</span>
          <span className="game-stat-value">{accuracy}</span>
        </div>
        <div
          className="game-stat game-stat--difficulty"
          style={{ '--difficulty-color': difficulty.color }}
        >
          <span className="game-stat-label">Difficulty</span>
          <span className="game-stat-value">{difficulty.label}</span>
        </div>
      </div>

      <div
        className="game-progress"
        role="progressbar"
        aria-label="Session progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct)}
      >
        <span className="game-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="game-stage">
        <div className="game-board-column">
          <FallingBoard
            notes={visibleNotes}
            currentGesture={currentGesture}
            bandPercent={bandPercent}
            phase={phase}
            readyCount={readyCount}
            canPlay={canPlay}
            pauseNote={readinessNote}
            feedback={feedback}
            summary={summary}
            difficulty={difficulty}
            durationMin={durationMin}
          />
          {phase === 'playing' && canPlay && !handsDetected && (
            <p className="game-hands-hint">Show your hand in the camera</p>
          )}
        </div>

        <aside className="game-side">
          <WebcamCard glow={glow} status={status} stream={stream} onRetry={handleRetry} />
          <div className="game-live">
            <span className="game-live-label">Now showing</span>
            <span className="game-live-value">{currentInfo ? currentInfo.label : 'No gesture'}</span>
          </div>
        </aside>
      </div>

      {phase !== 'done' && (
        <div className="game-actions">
          <Button variant="ghost" fullWidth={false} onClick={handleQuit}>Quit session</Button>
        </div>
      )}
    </main>
  )
}
