import { useEffect, useMemo, useState } from 'react'
import StatCard from '../components/StatCard'
import { AccuracyTrendChart, SessionsBarChart } from '../components/Charts'
import { listSessions } from '../api/sessions'
import {
  getWeeklySummary,
  getAccuracyTrend,
  getSessionsPerWeek,
  getSessionHistory,
} from '../data/sessionStore'
import './../styles/history.css'

export default function History() {
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

  const rows = useMemo(() => sessions ?? [], [sessions])
  const weeklySummary = useMemo(() => getWeeklySummary(rows), [rows])
  const accuracyTrend = useMemo(() => getAccuracyTrend(rows), [rows])
  const sessionsPerWeek = useMemo(() => getSessionsPerWeek(rows), [rows])
  const sessionHistory = useMemo(() => getSessionHistory(rows), [rows])

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

      {error && (
        <p className="page-status page-status--error" role="alert">
          We couldn&rsquo;t load your history: {error}
        </p>
      )}

      {sessions === null && !error ? (
        <p className="page-status" role="status">
          Loading your progress…
        </p>
      ) : (
        <>
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
                <li className="history-row history-row--head" aria-hidden="true">
                  <span>Date</span>
                  <span>Mode</span>
                  <span className="history-row-hits">Hits</span>
                  <span className="history-row-misses">Misses</span>
                  <span className="history-row-accuracy">Accuracy</span>
                  <span className="history-row-duration">Duration</span>
                </li>
                {sessionHistory.map((s) => (
                  <li key={s.id} className="history-row">
                    <span className="history-row-date">{s.date}</span>
                    <span className="history-row-mode">{s.mode}</span>
                    <span className="history-row-hits">{s.hits ?? '—'}</span>
                    <span className="history-row-misses">{s.misses ?? '—'}</span>
                    <span className="history-row-accuracy">{s.accuracy}%</span>
                    <span className="history-row-duration">{s.duration}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="history-sub">No sessions yet — complete your first session to start tracking progress.</p>
            )}
          </section>
        </>
      )}
    </main>
  )
}
