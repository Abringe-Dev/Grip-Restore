import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { listSessions } from '../api/sessions'
import { buildWeeklyForecast } from '../data/analytics'
import './../styles/weekly-plan.css'

function confidenceLabel(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)} confidence` : ''
}

export default function WeeklyPlan() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [now] = useState(() => new Date())

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

  const plan = useMemo(() => buildWeeklyForecast(sessions ?? [], now), [sessions, now])
  const loading = sessions === null && !error
  const primaryFocus = plan.focus[0] ?? null
  const focusCaption = plan.focus.length > 0
    ? plan.focus.map((g) => `${g.label} ${g.accuracy}%`).join(' · ')
    : 'No grip is below 75% recently'
  const forecastCaption = plan.hasData
    ? `${plan.outcomeLabel} · ${confidenceLabel(plan.confidence)}`
    : 'Complete a session to unlock a personal forecast'

  return (
    <main className="plan-main">
      <section className="plan-hero">
        <h1 className="plan-title">Your week ahead</h1>
        <p className="plan-sub">
          A forecast built from your recent accuracy, grip trends, and recovery
          time. Plans adapt as you play.
        </p>
      </section>

      {error && (
        <p className="page-status page-status--error" role="alert">
          We couldn&rsquo;t load your forecast: {error}
        </p>
      )}

      {loading ? (
        <p className="page-status" role="status">
          Reading your recent sessions…
        </p>
      ) : !error && (
        <>
          <section className="stats-grid" aria-label="Forecast summary">
            <StatCard
              label="Next-session forecast"
              value={plan.predictedAccuracy == null ? '—' : `${plan.predictedAccuracy}%`}
              caption={forecastCaption}
              tone={plan.outcomeTone}
            />
            <StatCard
              label="Weekly focus"
              value={primaryFocus ? primaryFocus.label : 'Balanced'}
              caption={focusCaption}
              tone="purple"
            />
            <StatCard
              label="Planned sessions"
              value={`${plan.sessionCount}`}
              caption={`${plan.durationMin} min · ${plan.difficulty.label}`}
              tone="green"
            />
          </section>

          <section className="plan-explainer" aria-labelledby="plan-why-title">
            <div className="plan-explainer-head">
              <h2 id="plan-why-title" className="plan-section-title">Why this plan?</h2>
              <span className={`plan-trend plan-trend--${plan.trendLabel}`}>
                {plan.trendLabel === 'improving' ? 'Trending up'
                  : plan.trendLabel === 'dipping' ? 'Trending down'
                    : plan.trendLabel === 'starting' ? 'Building a baseline'
                      : 'Holding steady'}
              </span>
            </div>
            <ul className="plan-explanation">
              {plan.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="plan-week" aria-labelledby="plan-week-title">
            <div className="plan-week-head">
              <h2 id="plan-week-title" className="plan-section-title">Next 7 days</h2>
              <p className="plan-week-hint">Sessions sit every other day to leave recovery time.</p>
            </div>
            <div className="plan-days">
              {plan.days.map((day) => (
                <article
                  key={day.dateISO}
                  className={`plan-day${day.isSessionDay ? ' is-session' : ''}`}
                >
                  <header className="plan-day-head">
                    <span className="plan-day-weekday">{day.weekday}</span>
                    <span className="plan-day-date">{day.dateLabel}</span>
                  </header>
                  {day.session ? (
                    <>
                      <p className="plan-day-mode">
                        {day.session.durationMin} min · {day.session.difficultyLabel}
                      </p>
                      <p className="plan-day-focus">
                        Focus: {day.session.focusLabel}
                        {day.session.focusAccuracy != null ? ` (${day.session.focusAccuracy}%)` : ''}
                      </p>
                      <p className="plan-day-forecast">
                        {day.session.expectedAccuracy}% expected
                      </p>
                      <div className="plan-day-actions">
                        <button
                          type="button"
                          className="plan-day-action"
                          onClick={() => navigate('/start-session', {
                            state: {
                              durationMin: day.session.durationMin,
                              difficulty: day.session.difficulty,
                            },
                          })}
                        >
                          Start
                        </button>
                        {day.session.focusGesture && (
                          <button
                            type="button"
                            className="plan-day-action plan-day-action--ghost"
                            onClick={() => navigate('/practice', {
                              state: { gesture: day.session.focusGesture },
                            })}
                          >
                            Practice
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="plan-day-rest">Rest &amp; recover</p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="plan-note">
            <p>{plan.trendSentence}</p>
            <p className="plan-note-soft">
              Forecasts are guidance, not a score. Stop if your hand feels sore
              or tired.
            </p>
          </section>
        </>
      )}
    </main>
  )
}
