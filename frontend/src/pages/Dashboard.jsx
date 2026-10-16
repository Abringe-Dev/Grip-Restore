import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import StatCard from '../components/StatCard'
import GestureCard from '../components/GestureCard'
import { useAuth } from '../context/useAuth'
import { loadSessions, getWeeklySummary } from '../data/sessionStore'
import './../styles/dashboard.css'

const gestures = [
  { emoji: '🤏🏻', label: 'Pinch', color: '#5B8DEF' },
  { emoji: '✊🏻', label: 'Fist', color: '#8175D5' },
  { emoji: '🖐🏻', label: 'Open Palm', color: '#3FAE7A' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { userId, userName } = useAuth()
  const summary = useMemo(() => getWeeklySummary(loadSessions(userId)), [userId])
  const remaining = Math.max(0, summary.sessionsGoal - summary.sessionsCompleted)

  return (
    <main className="dashboard-main">
      <section className="dashboard-hero">
        <h1 className="dashboard-title">Welcome back{userName ? `, ${userName}` : ''}!</h1>
        <p className="dashboard-sub">
          You&rsquo;re doing great &mdash; let&rsquo;s keep your hands moving.
        </p>
      </section>

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
          value={`${summary.bestStreak} days`}
          caption="You&rsquo;re on a roll &mdash; keep it going!"
          tone="purple"
        />
      </section>

      <section className="dashboard-start">
        <div className="dashboard-start-card">
          <h2 className="dashboard-start-title">Ready for today&rsquo;s session?</h2>
          <p className="dashboard-start-sub">
            A quick calibration, then a fun rhythm workout for your hands.
          </p>
          <Button onClick={() => navigate('/start-session')}>Start a session</Button>
        </div>
      </section>

      <section className="gesture-strip" aria-label="Gestures you will practice">
        <p className="gesture-strip-title">Gestures you&rsquo;ll practice</p>
        <div className="gesture-strip-row">
          {gestures.map((g) => (
            <GestureCard key={g.label} {...g} />
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