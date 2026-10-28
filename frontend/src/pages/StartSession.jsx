import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import GestureCard from '../components/GestureCard'
import { listSessions } from '../api/sessions'
import { getRecommendedDifficulty } from '../data/sessionStore'
import { DIFFICULTIES } from '../game/fallingGame'
import './../styles/start-session.css'

const durations = [
  { minutes: 5, label: 'Quick session', desc: 'A gentle warm-up to keep the habit.' },
  { minutes: 10, label: 'Standard session', desc: 'A full rhythm workout for steady progress.' },
]

const gestures = [
  { emoji: '🤏🏻', label: 'Pinch', color: '#5B8DEF' },
  { emoji: '✊🏻', label: 'Fist', color: '#8175D5' },
  { emoji: '🖐🏻', label: 'Open Palm', color: '#3FAE7A' },
]

export default function StartSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const preset = location.state ?? {}
  const presetDuration = durations.some((d) => d.minutes === preset.durationMin)
    ? preset.durationMin
    : 10
  const presetDifficulty = DIFFICULTIES.some((d) => d.key === preset.difficulty)
    ? preset.difficulty
    : null
  const [selected, setSelected] = useState(presetDuration)
  const [difficulty, setDifficulty] = useState(presetDifficulty ?? 'easy')
  const [recommendation, setRecommendation] = useState(null)
  const [picked, setPicked] = useState(Boolean(presetDifficulty))
  const pickedRef = useRef(Boolean(presetDifficulty))

  useEffect(() => {
    let active = true
    listSessions()
      .then((rows) => {
        if (!active) return
        const next = getRecommendedDifficulty(rows)
        setRecommendation(next)
        if (!pickedRef.current) setDifficulty(next.key)
      })
      .catch(() => {
        /* recommendation is a nice-to-have; keep the default */
      })
    return () => {
      active = false
    }
  }, [])

  const chooseDifficulty = (key) => {
    pickedRef.current = true
    setPicked(true)
    setDifficulty(key)
  }

  return (
    <main className="start-session-main">
      <section className="start-hero">
        <h1 className="start-title">Start a session</h1>
        <p className="start-sub">
          A quick calibration, then a fun rhythm workout for your hands. You&rsquo;ve
          got this!
        </p>
      </section>

      <section className="start-options" aria-label="Choose your session length">
        <p className="start-options-title">How long would you like to play?</p>
        <div className="start-options-row">
          {durations.map((d) => (
            <button
              key={d.minutes}
              type="button"
              className={`start-option${selected === d.minutes ? ' is-selected' : ''}`}
              onClick={() => setSelected(d.minutes)}
              aria-pressed={selected === d.minutes}
            >
              <span className="start-option-time">{d.minutes} min</span>
              <span className="start-option-label">{d.label}</span>
              <span className="start-option-desc">{d.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="start-options" aria-label="Choose your difficulty">
        <p className="start-options-title">How challenging should it be?</p>
        <p className="start-recommendation" role="status">
          {recommendation ? recommendation.reason : 'Checking your recent sessions…'}
        </p>
        <div className="start-options-row">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              type="button"
              className={`start-option start-option--difficulty${difficulty === d.key ? ' is-selected' : ''}`}
              style={{ '--option-color': d.color }}
              onClick={() => chooseDifficulty(d.key)}
              aria-pressed={difficulty === d.key}
            >
              {!picked && recommendation?.key === d.key && (
                <span className="start-option-recommended">Suggested</span>
              )}
              <span className="start-option-time">{d.label}</span>
              <span className="start-option-label">{d.tagline}</span>
              <span className="start-option-desc">{d.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="start-gestures" aria-label="Gestures you will practice">
        <p className="gesture-strip-title">Gestures you&rsquo;ll practice</p>
        <div className="gesture-strip-row">
          {gestures.map((g) => (
            <GestureCard key={g.label} {...g} />
          ))}
        </div>
      </section>

      <div className="start-action">
        <Button onClick={() => navigate('/setup', { state: { durationMin: selected, difficulty } })}>
          Begin Session
        </Button>
      </div>
    </main>
  )
}