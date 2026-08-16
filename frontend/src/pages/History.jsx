import StatCard from '../components/StatCard'
import { AccuracyTrendChart, SessionsBarChart } from '../components/Charts'
import { weeklySummary, accuracyTrend, sessionsPerWeek, sessionHistory } from '../data/mockSessions'
import './../styles/history.css'

export default function History() {
  return (
    <main className="history-main">
      <section className="history-hero">
        <h1 className="history-title">Your progress</h1>
        <p className="history-sub">
          Look how far you&rsquo;ve come &mdash; every session counts.
        </p>
      </section>

      <section className="stats-grid" aria-label="Progress summary">
        <StatCard label="Weekly Accuracy" value={`${weeklySummary.accuracy}%`} caption={`Up ${weeklySummary.accuracyChange}% from last week`} tone="blue" />
        <StatCard label="Sessions Completed" value={`${weeklySummary.sessionsCompleted}`} caption={`${weeklySummary.sessionsGoal - weeklySummary.sessionsCompleted} more to hit your weekly goal`} tone="green" />
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
        <ul className="history-list">
          {sessionHistory.map((s) => (
            <li key={`${s.date}-${s.gesture}`} className="history-row">
              <span className="history-row-date">{s.date}</span>
              <span className="history-row-gesture">{s.gesture}</span>
              <span className="history-row-duration">{s.duration}</span>
              <span className="history-row-accuracy">{s.accuracy}%</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}