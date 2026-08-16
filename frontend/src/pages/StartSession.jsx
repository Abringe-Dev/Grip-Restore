import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import GestureCard from '../components/GestureCard'
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
  const [selected, setSelected] = useState(10)

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

      <section className="start-gestures" aria-label="Gestures you will practice">
        <p className="gesture-strip-title">Gestures you&rsquo;ll practice</p>
        <div className="gesture-strip-row">
          {gestures.map((g) => (
            <GestureCard key={g.label} {...g} />
          ))}
        </div>
      </section>

      <div className="start-action">
        <Button onClick={() => navigate('/setup')}>Begin Session</Button>
      </div>
    </main>
  )
}