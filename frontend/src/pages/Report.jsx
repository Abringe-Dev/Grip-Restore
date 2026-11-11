import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import StatCard from '../components/StatCard'
import { HitsMissesChart, MissesByGestureChart } from '../components/Charts'
import { listSessions } from '../api/sessions'
import { useAuth } from '../context/useAuth'
import {
  DEFAULT_REPORT_RANGE,
  REPORT_RANGES,
  buildReport,
} from '../data/report'
import { getSessionHistory } from '../data/sessionStore'
import './../styles/report.css'

function formatMinutes(total) {
  const minutes = Math.max(0, Math.round(Number(total) || 0))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

function formatChange(change) {
  if (change == null) return 'Not enough prior data'
  if (change === 0) return 'Same as the previous period'
  return change > 0
    ? `Up ${change}% from the previous period`
    : `Down ${Math.abs(change)}% from the previous period`
}

function generatedLabel(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Report() {
  const navigate = useNavigate()
  const { userName } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [range, setRange] = useState(DEFAULT_REPORT_RANGE)

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
  const report = useMemo(() => buildReport(rows, range), [rows, range])
  const sessionLog = useMemo(() => getSessionHistory(report.sessions, 1000), [report.sessions])
  const loading = sessions === null && !error
  const generated = generatedLabel(new Date())

  const strongest = useMemo(() => {
    return [...report.gestures]
      .filter((gesture) => gesture.hasData)
      .sort((a, b) => b.accuracy - a.accuracy)[0] ?? null
  }, [report.gestures])

  const focus = useMemo(() => {
    return report.forecast.focus[0]
      ?? [...report.gestures]
        .filter((gesture) => gesture.hasData)
        .sort((a, b) => a.accuracy - b.accuracy)[0]
      ?? null
  }, [report.forecast.focus, report.gestures])

  const nextSession = report.forecast.hasData
    ? `${report.forecast.durationMin} min · ${report.forecast.difficulty.label}`
    : '5 min · Easy'

  return (
    <main className="report-main">
      <div className="report-print-header" aria-hidden="true">
        <span>Grip Restore</span>
        <span>Progress report · {generated}</span>
      </div>

      <section className="report-hero">
        <div>
          <p className="report-eyebrow">Progress report</p>
          <h1 className="report-title">Your practice snapshot</h1>
          <p className="report-sub">
            Prepared for {userName || 'you'} &middot; Generated {generated}
          </p>
        </div>
        <div className="report-actions">
          <Button fullWidth={false} onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </section>

      <section className="report-range" aria-label="Report time range">
        <span className="report-range-label">Time range</span>
        <div className="report-range-options">
          {REPORT_RANGES.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`report-range-button${option.key === range ? ' is-active' : ''}`}
              aria-pressed={option.key === range}
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="page-status page-status--error" role="alert">
          We couldn&rsquo;t load your report: {error}
        </p>
      )}

      {!error && (loading ? (
        <p className="page-status" role="status">
          Building your report&hellip;
        </p>
      ) : report.sessions.length === 0 ? (
        <section className="report-empty" aria-labelledby="report-empty-title">
          <h2 id="report-empty-title" className="report-empty-title">No sessions in this range</h2>
          <p className="report-empty-copy">
            Try a wider time range, or complete a practice session to start building your report.
          </p>
          <Button fullWidth={false} onClick={() => navigate('/start-session')}>
            Start a session
          </Button>
        </section>
      ) : (
        <>
          <section className="stats-grid report-stats" aria-label="Report summary">
            <StatCard
              label="Sessions"
              value={`${report.summary.sessionCount}`}
              caption={report.range.label}
              tone="green"
            />
            <StatCard
              label="Practice Time"
              value={formatMinutes(report.summary.totalMinutes)}
              caption={`${report.summary.activeDays} active ${report.summary.activeDays === 1 ? 'day' : 'days'}`}
              tone="purple"
            />
            <StatCard
              label="Average Accuracy"
              value={`${report.summary.accuracy}%`}
              caption={formatChange(report.accuracyChange)}
              tone="blue"
            />
            <StatCard
              label="Missed Gestures"
              value={`${report.summary.misses}`}
              caption={report.missInsights.mostMissed
                ? `${report.missInsights.mostMissed.label} most missed`
                : report.summary.misses > 0
                  ? 'Per-grip detail unavailable'
                  : 'No misses recorded'}
              tone="red"
            />
          </section>

          <section className="report-grid" aria-label="Gesture results">
            <article className="report-card">
              <h2 className="report-section-title">Per-gesture results</h2>
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">Grip</th>
                      <th scope="col">Attempts</th>
                      <th scope="col">Hits</th>
                      <th scope="col">Misses</th>
                      <th scope="col">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.gestures.map((gesture) => (
                      <tr key={gesture.key}>
                        <th scope="row">
                          <span className="report-gesture">
                            <span aria-hidden="true">{gesture.emoji}</span>
                            {gesture.label}
                          </span>
                        </th>
                        <td>{gesture.hasData ? gesture.attempts : '—'}</td>
                        <td className="report-hits">{gesture.hasData ? gesture.hits : '—'}</td>
                        <td className="report-misses">{gesture.hasData ? gesture.misses : '—'}</td>
                        <td>{gesture.accuracy == null ? '—' : `${gesture.accuracy}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <MissesByGestureChart data={report.gestures} />
            </article>

            <article className="report-card">
              <h2 className="report-section-title">Hits vs misses</h2>
              <div className="chart-legend">
                <span className="chart-legend-item">
                  <span className="chart-legend-swatch chart-legend-swatch--hits" aria-hidden="true" />
                  Hits
                </span>
                <span className="chart-legend-item">
                  <span className="chart-legend-swatch chart-legend-swatch--misses" aria-hidden="true" />
                  Misses
                </span>
              </div>
              <HitsMissesChart data={report.weekly} />
              <p className="report-note">Last 7 weeks within the selected range.</p>
            </article>
          </section>

          <section className="report-card" aria-labelledby="report-log-title">
            <h2 id="report-log-title" className="report-section-title">Session log</h2>
            <div className="report-table-wrap">
              <table className="report-table report-table--log">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Mode</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Hits</th>
                    <th scope="col">Misses</th>
                    <th scope="col">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionLog.map((session) => (
                    <tr key={session.id}>
                      <td>{session.date}</td>
                      <td>{session.mode}</td>
                      <td>{session.duration}</td>
                      <td className="report-hits">{session.hits ?? '—'}</td>
                      <td className="report-misses">{session.misses ?? '—'}</td>
                      <td>{session.accuracy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="report-card report-insights" aria-labelledby="report-insights-title">
            <h2 id="report-insights-title" className="report-section-title">What this suggests</h2>
            <div className="report-insight-grid">
              <div className="report-insight">
                <span className="report-insight-label">Strongest grip</span>
                <strong>{strongest ? `${strongest.label} · ${strongest.accuracy}%` : 'Not enough data'}</strong>
                <p>
                  {strongest
                    ? `${strongest.hits} hits across ${strongest.attempts} attempts.`
                    : 'Complete a few sessions to compare your grips.'}
                </p>
              </div>
              <div className="report-insight">
                <span className="report-insight-label">Focus next</span>
                <strong>{focus ? `${focus.label} · ${focus.accuracy}%` : 'Balanced mix'}</strong>
                <p>
                  {focus
                    ? `${focus.attempts} recent attempts; this grip has the most room to improve.`
                    : 'No single grip is lagging. Rotate all three evenly.'}
                </p>
              </div>
              <div className="report-insight">
                <span className="report-insight-label">Suggested next session</span>
                <strong>{nextSession}</strong>
                <p>{report.forecast.difficulty.reason}</p>
              </div>
            </div>
            <p className="report-disclaimer">
              This report summarizes practice activity. It is not a clinical assessment,
              diagnosis, or a replacement for medical advice.
            </p>
          </section>
        </>
      ))}
    </main>
  )
}
