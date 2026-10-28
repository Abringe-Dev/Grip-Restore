import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import WebcamCard from '../components/WebcamCard'
import { useWebcam } from '../context/useWebcam'
import { useHandTracking } from '../context/useHandTracking'
import { getPracticeProgress, recordPracticeAttempt } from '../api/practice'
import { GESTURES, gestureByKey } from '../game/session'
import {
  createPracticeState,
  practicePercent,
  shouldSuggestSession,
  tickPractice,
} from '../practice/practiceEngine'
import { PRACTICE_CONFIG } from '../practice/practiceConfig'
import './../styles/practice.css'

const DEFAULT_GESTURE = GESTURES[0].key

const GESTURE_HINTS = {
  pinch: 'Thumb and index finger together',
  fist: 'Fingers curled into a soft fist',
  palm: 'All five fingers spread wide',
}

function savedFor(progress, gesture) {
  return progress?.find((row) => row.gesture === gesture) ?? null
}

function statusCopy(practice, label, trackingStatus) {
  if (trackingStatus === 'loading') return 'Loading hand tracking…'
  if (trackingStatus === 'error') return 'Hand tracking is unavailable. Try again.'
  if (practice.awaitingRelease) return 'Nice! Release your hand, then go again.'
  if (practice.status === 'correct') {
    return `Hold it… ${(practice.heldMs / 1000).toFixed(1)}s / ${(PRACTICE_CONFIG.holdMs / 1000).toFixed(0)}s`
  }
  if (practice.status === 'almost') return `Almost — make a clear ${label.toLowerCase()}.`
  return `Show a ${label.toLowerCase()} to the camera.`
}

export default function Practice() {
  const location = useLocation()
  const navigate = useNavigate()
  const requestedGesture = gestureByKey(location.state?.gesture)?.key ?? DEFAULT_GESTURE
  const [selected, setSelected] = useState(requestedGesture)
  const [practice, setPractice] = useState(() => createPracticeState(requestedGesture))
  const [progress, setProgress] = useState(null)
  const [progressError, setProgressError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [suggestedGesture, setSuggestedGesture] = useState(null)
  const { status, stream, start } = useWebcam()
  const { currentGesture, trackingStatus, startTracking } = useHandTracking()
  const practiceRef = useRef(practice)
  const suggestedRef = useRef(new Set())
  const activeMeta = gestureByKey(selected) ?? GESTURES[0]
  const suggestedMeta = gestureByKey(suggestedGesture)
  const tracking = trackingStatus === 'active'

  useEffect(() => {
    start()
    startTracking()
  }, [start, startTracking])

  useEffect(() => {
    let active = true
    getPracticeProgress()
      .then((rows) => {
        if (active) setProgress(rows)
      })
      .catch((err) => {
        if (active) setProgressError(err.message)
      })
    return () => {
      active = false
    }
  }, [])

  const saveAttempt = useEffectEvent((event) => {
    recordPracticeAttempt(event.gesture, event.type === 'success')
      .then((saved) => {
        setSaveError('')
        setProgress((prev) => {
          if (!prev) return prev
          return prev.map((row) => (row.gesture === saved.gesture ? saved : row))
        })
      })
      .catch((err) => {
        setSaveError(err.message)
      })
  })

  const onTick = useEffectEvent(() => {
    const result = tickPractice(
      practiceRef.current,
      currentGesture,
      PRACTICE_CONFIG.tickMs,
      PRACTICE_CONFIG,
    )
    practiceRef.current = result.state
    setPractice(result.state)
    if (!result.event) return
    saveAttempt(result.event)
    if (
      result.event.type === 'success'
      && shouldSuggestSession(result.state, PRACTICE_CONFIG)
      && !suggestedRef.current.has(result.event.gesture)
    ) {
      suggestedRef.current.add(result.event.gesture)
      setSuggestedGesture(result.event.gesture)
    }
  })

  useEffect(() => {
    if (!tracking) return undefined
    const id = setInterval(onTick, PRACTICE_CONFIG.tickMs)
    return () => clearInterval(id)
  }, [tracking])

  const chooseGesture = (key) => {
    const next = createPracticeState(key)
    practiceRef.current = next
    setPractice(next)
    setSelected(key)
    setSaveError('')
    setSuggestedGesture(null)
  }

  const handleRetry = useCallback(() => {
    start()
    startTracking()
  }, [start, startTracking])

  const pct = practicePercent(practice, PRACTICE_CONFIG)
  const localSummary = practice.attempts > 0
    ? `${practice.successes}/${practice.attempts} holds this visit · best streak ${practice.bestStreak}`
    : 'No attempts yet this visit'

  return (
    <main className="practice-main">
      <section className="practice-hero">
        <h1 className="practice-title">Practice a gesture</h1>
        <p className="practice-sub">
          Slow, steady repetitions build the grip you&rsquo;ll use in gameplay.
          Hold the gesture for two seconds to count a success.
        </p>
      </section>

      {progressError && (
        <p className="page-status page-status--error" role="alert">
          We couldn&rsquo;t load your saved practice progress: {progressError}
        </p>
      )}

      <section className="practice-layout">
        <div className="practice-camera">
          <WebcamCard
            glow={activeMeta.glow}
            status={status}
            stream={stream}
            onRetry={handleRetry}
          />

          <div className="practice-hold" aria-live="polite">
            <div
              className="practice-target"
              style={{ '--practice-color': activeMeta.color }}
            >
              <span className="practice-target-emoji" aria-hidden="true">{activeMeta.emoji}</span>
              <span className="practice-target-copy">
                <span className="practice-target-label">Target · {activeMeta.label}</span>
                <span className="practice-target-hint">
                  {GESTURE_HINTS[selected] ?? 'Match the selected gesture'}
                </span>
              </span>
            </div>
            <p className="practice-status" style={{ color: activeMeta.color }}>
              {statusCopy(practice, activeMeta.label, trackingStatus)}
            </p>
            <div
              className="practice-bar"
              role="progressbar"
              aria-label={`${activeMeta.label} hold progress`}
              aria-valuemin={0}
              aria-valuemax={PRACTICE_CONFIG.holdMs}
              aria-valuenow={practice.heldMs}
            >
              <div
                className="practice-bar-fill"
                style={{ width: `${pct}%`, background: activeMeta.color }}
              />
            </div>
            <p className="practice-visit-summary">{localSummary}</p>
          </div>

          {suggestedMeta && (
            <div className="practice-suggestion" role="status" aria-live="polite">
              <p className="practice-suggestion-copy">
                <strong>Three in a row!</strong> Your {suggestedMeta.label.toLowerCase()} is
                looking steady. Ready to put it to work in a play session?
              </p>
              <div className="practice-suggestion-actions">
                <Button fullWidth={false} onClick={() => navigate('/start-session')}>
                  Start a play session
                </Button>
                <Button
                  fullWidth={false}
                  variant="ghost"
                  onClick={() => setSuggestedGesture(null)}
                >
                  Keep practicing
                </Button>
              </div>
            </div>
          )}

          {!tracking && trackingStatus !== 'loading' && (
            <Button onClick={handleRetry}>Try camera again</Button>
          )}
        </div>

        <aside className="practice-panel" aria-label="Choose a gesture to practice">
          <h2 className="practice-panel-title">Choose a gesture</h2>
          <div className="practice-gesture-list">
            {GESTURES.map((gesture) => {
              const stats = savedFor(progress, gesture.key)
              return (
                <button
                  key={gesture.key}
                  type="button"
                  className={`practice-gesture${selected === gesture.key ? ' is-selected' : ''}`}
                  style={{
                    '--practice-color': gesture.color,
                    '--practice-glow': `var(--glow-${gesture.glow})`,
                  }}
                  onClick={() => chooseGesture(gesture.key)}
                  aria-pressed={selected === gesture.key}
                >
                  <span className="practice-gesture-emoji" aria-hidden="true">{gesture.emoji}</span>
                  <span className="practice-gesture-copy">
                    <span className="practice-gesture-name">{gesture.label}</span>
                    <span className="practice-gesture-stats">
                      {stats?.attempts
                        ? `${stats.accuracy}% accuracy · ${stats.successes}/${stats.attempts} holds`
                        : 'No attempts yet'}
                    </span>
                    <span className="practice-gesture-best">
                      {stats ? `Current streak ${stats.currentStreak} · best ${stats.bestStreak}` : 'Best streak —'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="practice-tip">
            <h3 className="practice-tip-title">How practice counts</h3>
            <ul className="practice-tip-list">
              <li>Make the selected gesture and hold it for two seconds.</li>
              <li>Releasing early, or changing gesture, ends the attempt.</li>
              <li>Three successes in a row are a great time to play a session.</li>
            </ul>
          </div>

          {saveError && (
            <p className="practice-save-error" role="alert">
              Progress couldn&rsquo;t be saved: {saveError}
            </p>
          )}
        </aside>
      </section>
    </main>
  )
}
