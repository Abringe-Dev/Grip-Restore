import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import GestureCard from '../components/GestureCard'
import WebcamCard from '../components/WebcamCard'
import { useWebcam } from '../context/useWebcam'
import { useHandTracking } from '../context/useHandTracking'
import { useAuth } from '../context/useAuth'
import { saveSession } from '../data/sessionStore'
import {
  DEFAULT_DURATION_MIN,
  GAP_MS,
  GESTURES,
  GESTURE_LABELS,
  READY_MS,
  SESSION_DURATIONS,
  TICK_MS,
  WINDOW_MS,
  createPromptGenerator,
  elapsedToDurationMin,
  gestureByKey,
  scoreWindow,
  summarizeResults,
} from '../game/session'
import { initSounds, playFinish, playPrompt, playSuccess, playTick } from '../game/sounds'
import './../styles/game.css'

const RING_RADIUS = 80
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function TimerRing({ fraction, seconds, color }) {
  const clamped = Math.min(1, Math.max(0, fraction))
  return (
    <div className="game-ring">
      <svg viewBox="0 0 180 180" className="game-ring-svg" aria-hidden="true">
        <circle className="game-ring-track" cx="90" cy="90" r={RING_RADIUS} />
        <circle
          className="game-ring-progress"
          cx="90"
          cy="90"
          r={RING_RADIUS}
          stroke={color}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - clamped)}
        />
      </svg>
      <span className="game-ring-seconds">{seconds}s</span>
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
  const calibration = location.state?.calibration ?? null

  const [phase, setPhase] = useState('ready')
  const [promptGesture, setPromptGesture] = useState(null)
  const [readyRemainingMs, setReadyRemainingMs] = useState(READY_MS)
  const [windowRemainingMs, setWindowRemainingMs] = useState(WINDOW_MS)
  const [sessionRemainingMs, setSessionRemainingMs] = useState(durationMin * 60000)
  const [lastResult, setLastResult] = useState(null)
  const [stats, setStats] = useState({ attempted: 0, succeeded: 0 })

  const endedRef = useRef(false)
  const readyMsRef = useRef(READY_MS)
  const windowMsRef = useRef(WINDOW_MS)
  const gapMsRef = useRef(GAP_MS)
  const sessionMsRef = useRef(durationMin * 60000)
  const windowSamplesRef = useRef([])
  const scoredWindowsRef = useRef([])
  const playStartedAtRef = useRef(null)
  const generatorRef = useRef(null)
  const lastReadyCountRef = useRef(null)
  const navigateTimerRef = useRef(0)

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
    }
  }, [])

  const handleRetry = useCallback(() => {
    start()
    startTracking()
  }, [start, startTracking])

  const beginWindow = () => {
    if (!generatorRef.current) generatorRef.current = createPromptGenerator()
    const next = generatorRef.current.next()
    windowSamplesRef.current = []
    windowMsRef.current = WINDOW_MS
    setWindowRemainingMs(WINDOW_MS)
    setPromptGesture(next)
    setLastResult(null)
    setPhase('prompt')
    playPrompt()
  }

  const finishSession = () => {
    if (endedRef.current) return
    endedRef.current = true
    const summary = summarizeResults(scoredWindowsRef.current)
    if (userId && summary.attempted > 0) {
      saveSession(userId, {
        durationMin,
        gesture: summary.gesture,
        gestures: GESTURE_LABELS,
        accuracy: summary.accuracy,
        calibration,
      })
    }
    setPhase('done')
    playFinish()
    navigateTimerRef.current = setTimeout(() => navigate('/history'), 1400)
  }

  const onTick = useEffectEvent(() => {
    if (endedRef.current) return

    if (phase === 'ready') {
      readyMsRef.current = Math.max(0, readyMsRef.current - TICK_MS)
      setReadyRemainingMs(readyMsRef.current)
      const count = Math.ceil(readyMsRef.current / 1000)
      if (count > 0 && count !== lastReadyCountRef.current) {
        lastReadyCountRef.current = count
        playTick()
      }
      if (readyMsRef.current <= 0) {
        playStartedAtRef.current = Date.now()
        beginWindow()
      }
      return
    }

    if (phase === 'prompt') {
      windowSamplesRef.current.push(currentGesture)
      windowMsRef.current = Math.max(0, windowMsRef.current - TICK_MS)
      sessionMsRef.current = Math.max(0, sessionMsRef.current - TICK_MS)
      setWindowRemainingMs(windowMsRef.current)
      setSessionRemainingMs(sessionMsRef.current)
      if (windowMsRef.current <= 0) {
        const result = scoreWindow(windowSamplesRef.current, promptGesture)
        if (result.eligible) {
          scoredWindowsRef.current.push({ target: result.target, success: result.success })
          setStats((prev) => ({
            attempted: prev.attempted + 1,
            succeeded: prev.succeeded + (result.success ? 1 : 0),
          }))
          setLastResult(result.success ? 'success' : 'miss')
          if (result.success) playSuccess()
        }
        windowSamplesRef.current = []
        if (sessionMsRef.current <= 0) {
          finishSession()
        } else {
          gapMsRef.current = GAP_MS
          setPhase('between')
        }
      }
      return
    }

    if (phase === 'between') {
      sessionMsRef.current = Math.max(0, sessionMsRef.current - TICK_MS)
      gapMsRef.current = Math.max(0, gapMsRef.current - TICK_MS)
      setSessionRemainingMs(sessionMsRef.current)
      if (sessionMsRef.current <= 0) {
        finishSession()
      } else if (gapMsRef.current <= 0) {
        beginWindow()
      }
    }
  })

  useEffect(() => {
    if (!canPlay) return undefined
    const id = setInterval(onTick, TICK_MS)
    return () => clearInterval(id)
  }, [canPlay])

  const handleQuit = () => {
    if (endedRef.current) return
    endedRef.current = true
    const summary = summarizeResults(scoredWindowsRef.current)
    if (userId && summary.attempted > 0) {
      const elapsedMs = playStartedAtRef.current ? Date.now() - playStartedAtRef.current : 0
      saveSession(userId, {
        durationMin: elapsedToDurationMin(elapsedMs),
        gesture: summary.gesture,
        gestures: GESTURE_LABELS,
        accuracy: summary.accuracy,
        calibration,
      })
    }
    navigate('/history')
  }

  const currentInfo = gestureByKey(promptGesture) ?? GESTURES[0]
  const readyCount = Math.max(1, Math.ceil(readyRemainingMs / 1000))
  const sessionSeconds = Math.max(0, Math.ceil(sessionRemainingMs / 1000))
  const clock = `${Math.floor(sessionSeconds / 60)}:${String(sessionSeconds % 60).padStart(2, '0')}`
  const liveAccuracy = stats.attempted > 0 ? Math.round((stats.succeeded * 100) / stats.attempted) : null

  let readinessNote = null
  if (status !== 'active') {
    if (status === 'requesting' || status === 'idle') readinessNote = 'Turning on your camera…'
    else if (status === 'denied') readinessNote = 'Camera needed — allow access to play'
    else if (status === 'unsupported') readinessNote = 'Your browser doesn\u2019t support camera access'
    else readinessNote = 'Camera error — use Try again in the camera card'
  } else if (trackingStatus !== 'active') {
    readinessNote = trackingStatus === 'error'
      ? 'Hand tracking paused — tap retry in the camera card'
      : 'Warming up hand tracking…'
  }

  const glow = phase === 'ready' || phase === 'done' ? 'teal' : currentInfo.glow

  return (
    <main className="game-main">
      <div className="game-topbar">
        <div className="game-stat">
          <span className="game-stat-label">Time left</span>
          <span className="game-stat-value" role="timer">{clock}</span>
        </div>
        <div className="game-stat">
          <span className="game-stat-label">Score</span>
          <span className="game-stat-value">{stats.succeeded}/{stats.attempted}</span>
        </div>
        <div className="game-stat">
          <span className="game-stat-label">Accuracy</span>
          <span className="game-stat-value">{liveAccuracy == null ? '—' : `${liveAccuracy}%`}</span>
        </div>
      </div>

      {!canPlay && readinessNote && (
        <p className="game-note" role="status">{readinessNote}</p>
      )}

      <div className="game-stage">
        <div className="game-camera">
          <WebcamCard glow={glow} status={status} stream={stream} onRetry={handleRetry} />
        </div>

        <aside className={`game-hud${canPlay ? '' : ' is-paused'}`}>
          {phase === 'ready' && (
            <div className="game-ready">
              <p className="game-ready-title">Get ready</p>
              <span className="game-ready-count">{readyCount}</span>
            </div>
          )}

          {phase === 'prompt' && (
            <>
              <TimerRing
                fraction={windowRemainingMs / WINDOW_MS}
                seconds={Math.ceil(windowRemainingMs / 1000)}
                color={currentInfo.color}
              />
              <p className="game-prompt-title">Show this gesture</p>
              <GestureCard emoji={currentInfo.emoji} label={currentInfo.label} color={currentInfo.color} />
              <p className="game-prompt-hint">Hold {currentInfo.label} until the ring empties</p>
            </>
          )}

          {phase === 'between' && (
            <>
              <TimerRing fraction={0} seconds={0} color={currentInfo.color} />
              {lastResult && (
                <p className={`game-feedback game-feedback--${lastResult}`} role="status">
                  {lastResult === 'success' ? 'Nice!' : 'Missed — next one!'}
                </p>
              )}
            </>
          )}

          {phase === 'done' && (
            <div className="game-card">
              <span className="game-emoji" aria-hidden="true">🎉</span>
              <h1 className="game-title">Session complete!</h1>
              <p className="game-sub">
                You scored {stats.attempted > 0 ? Math.round((stats.succeeded * 100) / stats.attempted) : 0}%
                {' '}({stats.succeeded}/{stats.attempted} windows)
              </p>
            </div>
          )}

          {canPlay && !handsDetected && phase !== 'done' && (
            <p className="game-hands-hint">Show your hand in the camera</p>
          )}
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
