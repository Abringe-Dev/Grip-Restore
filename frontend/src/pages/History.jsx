import { useMemo } from 'react'
import StatCard from '../components/StatCard'
import { AccuracyTrendChart, SessionsBarChart } from '../components/Charts'
import { useAuth } from '../context/useAuth'
import {
  loadSessions,
  getWeeklySummary,
  getAccuracyTrend,
  getSessionsPerWeek,
  getSessionHistory,
} from '../data/sessionStore'
import './../styles/history.css'

export default function History() {
  const { userId } = useAuth()
  const sessions = useMemo(() => loadSessions(userId), [userId])
  const weeklySummary = useMemo(() => getWeeklySummary(sessions), [sessions])
  const accuracyTrend = useMemo(() => getAccuracyTrend(sessions), [sessions])
  const sessionsPerWeek = useMemo(() => getSessionsPerWeek(sessions), [sessions])
  const sessionHistory = useMemo(() => getSessionHistory(sessions), [sessions])

  const remaining = Math.max(0, weeklySummary.sessionsGoal - weeklySummary.sessionsCompleted)
  const changeCaption = weeklySummary.accuracyChange >= 0
    ? `Up ${weeklySummary.accuracyChange}% from last week`
    : `Down ${-weeklySummary.accuracyChange}% from last week`

  return (
    <main className="history-main">
      <section className="history-hero">
        <h1 className="history-title">Your progress</h1>
        <p className="history-sub">
          Look how far you&rsquo;ve come &mdash; every session counts.
        </p>
      </section>

      <section className="stats-grid" aria-label="Progress summary">
        <StatCard label="Weekly Accuracy" value={`${weeklySummary.accuracy}%`} caption={changeCaption} tone="blue" />
        <StatCard
          label="Sessions Completed"
          value={`${weeklySummary.sessionsCompleted}`}
          caption={remaining > 0 ? `${remaining} more to hit your weekly goal` : 'Goal reached — amazing!'}
          tone="green"
        />
        <StatCard label="Best Streak" value={`${weeklySummary.bestStreak} days`} caption="Keep the momentum going!" tone="purple" />
      </section>

      <section className="history-charts" aria-label="Charts">
        <div className="history-chart-card">
          <h2 className="history-chart-title">Accuracy over time</h2>
          <AccuracyTrendChart data={accuracyTrend} />
        </div>
        <div className="history-chart-card">
          <h2 className="history-chart-title">Sessions per week</h2>
          <SessionsBarChart data={sessionsPerWeek} />
        </div>
      </section>

      <section className="history-list-card" aria-label="Past sessions">
        <h2 className="history-list-title">Recent sessions</h2>
        {sessionHistory.length > 0 ? (
          <ul className="history-list">
            {sessionHistory.map((s) => (
              <li key={s.id} className="history-row">
                <span className="history-row-date">{s.date}</span>
                <span className="history-row-gesture">{s.gesture}</span>
                <span className="history-row-duration">{s.duration}</span>
                <span className="history-row-accuracy">{s.accuracy}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="history-sub">No sessions yet — complete your first session to start tracking progress.</p>
        )}
      </section>
    </main>
  )
}