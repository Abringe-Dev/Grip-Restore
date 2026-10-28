import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import StatCard from '../components/StatCard'
import GestureCard from '../components/GestureCard'
import { useAuth } from '../context/useAuth'
import { listSessions } from '../api/sessions'
import { buildWeeklyForecast } from '../data/analytics'
import { formatDays, getWeeklySummary } from '../data/sessionStore'
import './../styles/dashboard.css'

const gestures = [
  { key: 'pinch', emoji: '🤏🏻', label: 'Pinch', color: '#5B8DEF' },
  { key: 'fist', emoji: '✊🏻', label: 'Fist', color: '#8175D5' },
  { key: 'palm', emoji: '🖐🏻', label: 'Open Palm', color: '#3FAE7A' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { userName } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listSessions()
      .then((rows) => {
        if (active) setSessions(rows)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [])

  const summary = useMemo(() => getWeeklySummary(sessions ?? []), [sessions])
  const forecast = useMemo(() => buildWeeklyForecast(sessions ?? []), [sessions])
  const remaining = Math.max(0, summary.sessionsGoal - summary.sessionsCompleted)
  const loading = sessions === null && !error
  const focusCopy = forecast.focus.length > 0
    ? forecast.focus.map((g) => `${g.label} ${g.accuracy}%`).join(' · ')
    : 'balanced grip mix'

  return (
    <main className="dashboard-main">
      <section className="dashboard-hero">
        <h1 className="dashboard-title">Welcome back{userName ? `, ${userName}` : ''}!</h1>
        <p className="dashboard-sub">
          You&rsquo;re doing great &mdash; let&rsquo;s keep your hands moving.
        </p>
      </section>

      {error && (
        <p className="page-status page-status--error" role="alert">
          We couldn&rsquo;t load your progress: {error}
        </p>
      )}

      {loading ? (
        <p className="page-status" role="status">
          Loading your progress…
        </p>
      ) : (
        <section className="stats-grid" aria-label="Your weekly summary">
          <StatCard
            label="Weekly Accuracy"
            value={`${summary.accuracy}%`}
            caption={summary.accuracyChange >= 0
              ? `Up ${summary.accuracyChange}% from last week`
              : `Down ${-summary.accuracyChange}% from last week`}
            tone="blue"
          />
          <StatCard
            label="Sessions Completed"
            value={`${summary.sessionsCompleted}`}
            caption={remaining > 0 ? `${remaining} more to hit your weekly goal` : 'Goal reached — amazing!'}
            tone="green"
          />
          <StatCard
            label="Best Streak"
            value={formatDays(summary.bestStreak)}
            caption="You&rsquo;re on a roll &mdash; keep it going!"
            tone="purple"
          />
        </section>
      )}

      <section className="dashboard-start">
        <div className="dashboard-start-card">
          <p className="dashboard-start-kicker">Next session</p>
          <h2 className="dashboard-start-title">
            {loading ? 'Building your plan…' : `${forecast.durationMin} min · ${forecast.difficulty.label}`}
          </h2>
          <p className="dashboard-start-sub">
            {loading
              ? 'Reading your recent sessions to choose a comfortable next step.'
              : forecast.hasData
                ? `About ${forecast.predictedAccuracy}% expected · Focus: ${focusCopy}`
                : 'Start with a balanced session. Your personal forecast unlocks after a few games.'}
          </p>
          <div className="dashboard-start-actions">
            <Button
              fullWidth={false}
              onClick={() => navigate('/start-session', {
                state: {
                  durationMin: forecast.durationMin,
                  difficulty: forecast.difficulty.key,
                },
              })}
            >
              Start this session
            </Button>
            <Button fullWidth={false} variant="ghost" onClick={() => navigate('/plan')}>
              View week plan
            </Button>
          </div>
        </div>
      </section>

      <section className="gesture-strip" aria-label="Practice one gesture">
        <p className="gesture-strip-title">Practice one gesture</p>
        <div className="gesture-strip-row">
          {gestures.map((g) => (
            <button
              key={g.key}
              type="button"
              className="gesture-link"
              aria-label={`Practice ${g.label}`}
              onClick={() => navigate('/practice', { state: { gesture: g.key } })}
            >
              <GestureCard emoji={g.emoji} label={g.label} color={g.color} />
              <span className="gesture-link-label">Practice</span>
            </button>
          ))}
        </div>
      </section>

      <p className="camera-hint">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M2 8h14v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16 11l5-3v8l-5-3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        Camera access required for gameplay
      </p>
    </main>
  )
}
