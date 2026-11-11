import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import GestureCard from '../components/GestureCard'
import Logo from '../components/Logo'
import { useAuth } from '../context/useAuth'
import './../styles/landing.css'

const gestures = [
  { emoji: '🤏🏻', label: 'Pinch', color: '#5B8DEF' },
  { emoji: '✊🏻', label: 'Fist', color: '#8175D5' },
  { emoji: '🖐🏻', label: 'Open Palm', color: '#3FAE7A' },
]

const facts = [
  'Browser-based — no app install',
  'Webcam-guided hand tracking',
  'Progress saved to your account',
]

const supportCards = [
  {
    title: 'For stroke survivors',
    copy: 'Built around hand and grip practice after stroke.',
  },
  {
    title: 'Short sessions',
    copy: 'Choose five or ten minutes based on your energy.',
  },
  {
    title: 'One grip at a time',
    copy: 'Focus on Pinch, Fist, or Open Palm when a full session feels like too much.',
  },
  {
    title: 'Progress you can see',
    copy: 'Review accuracy, streaks, history, and your weekly plan.',
  },
]

const steps = [
  {
    title: 'Create your account',
    copy: 'Register, verify your email, and sign in so your progress stays with you.',
  },
  {
    title: 'Allow camera access',
    copy: 'Your browser uses the webcam to recognize your hand. Frames are processed on your device.',
  },
  {
    title: 'Choose your practice',
    copy: 'Pick a short session or focus on one grip, then follow the on-screen prompts.',
  },
  {
    title: 'Review your progress',
    copy: 'See accuracy, session history, and a weekly plan that adapts over time.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()

  const startLabel = isAuthenticated ? 'Go to dashboard' : 'Create your account'
  const startAction = () => navigate(isAuthenticated ? '/dashboard' : '/register')

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link className="landing-brand" to="/" aria-label="Grip Restore home">
            <Logo size={40} showName={false} />
            <span className="landing-brand-name">Grip Restore</span>
          </Link>

          <nav className="landing-nav" aria-label="Landing page sections">
            <a href="#what-is">What it is</a>
            <a href="#how-it-works">How it works</a>
            <a href="#safety">Safety</a>
          </nav>

          <div className="landing-header-actions">
            {!loading && (isAuthenticated ? (
              <Link className="landing-header-cta" to="/dashboard">Dashboard</Link>
            ) : (
              <>
                <Link className="landing-signin" to="/login">Sign in</Link>
                <Link className="landing-header-cta" to="/register">Create account</Link>
              </>
            ))}
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">
              <span className="landing-eyebrow-dot" aria-hidden="true" />
              For stroke survivors
            </p>
            <h1 id="landing-title" className="landing-title">
              Hand and grip practice, built for stroke survivors.
            </h1>
            <p className="landing-lead">
              Grip Restore is a webcam-guided exercise companion for stroke
              survivors. Short, structured sessions help you practice Pinch,
              Fist, and Open Palm at home &mdash; at a pace that works for you.
            </p>
            <div className="landing-hero-actions">
              <Button fullWidth={false} onClick={startAction}>{startLabel}</Button>
              {!isAuthenticated && (
                <Button fullWidth={false} variant="ghost" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
              )}
            </div>
            <p className="landing-disclaimer">An exercise aid, not medical advice.</p>
          </div>

          <div className="landing-hero-visual" aria-label="Example Grip Restore session">
            <div className="landing-preview-glow" aria-hidden="true" />
            <div className="landing-preview-card">
              <div className="landing-preview-head">
                <span className="landing-preview-kicker">Example session</span>
                <span className="landing-preview-time">10 min</span>
              </div>
              <p className="landing-preview-title">Easy &middot; Mixed grips</p>
              <div className="landing-preview-gestures">
                {gestures.map((gesture) => (
                  <GestureCard key={gesture.label} {...gesture} />
                ))}
              </div>
              <div className="landing-preview-progress">
                <span className="landing-preview-progress-label">Session progress</span>
                <span className="landing-preview-progress-value">72%</span>
                <div className="landing-preview-track" aria-hidden="true">
                  <span />
                </div>
              </div>
              <p className="landing-preview-note">
                Practice each grip at your own pace, with clear prompts and feedback.
              </p>
            </div>
            <span className="landing-preview-chip landing-preview-chip--top">Hand tracking on</span>
            <span className="landing-preview-chip landing-preview-chip--bottom">Three grip patterns</span>
          </div>
        </section>

        <section id="what-is" className="landing-section landing-about" aria-labelledby="what-is-title">
          <div className="landing-section-intro">
            <p className="landing-section-eyebrow">What it is</p>
            <h2 id="what-is-title" className="landing-section-title">
              A simple way to practice hand movement after stroke.
            </h2>
          </div>
          <div className="landing-about-body">
            <p>
              Grip Restore turns hand and grip exercises into short, guided
              sessions. Your webcam recognizes three hand shapes, so you can
              practice without extra equipment.
            </p>
            <p>
              Use a five- or ten-minute session for a full practice block, or
              focus on one grip when you want something smaller. Your account
              keeps your progress together.
            </p>
            <p>
              Grip Restore is designed for stroke survivors. It supports
              practice; it does not replace occupational therapy, physical
              therapy, or medical care.
            </p>
            <ul className="landing-facts" aria-label="Grip Restore at a glance">
              {facts.map((fact) => (
                <li key={fact} className="landing-fact">
                  <span className="landing-fact-mark" aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-section landing-supports" aria-labelledby="supports-title">
          <div className="landing-section-intro landing-section-intro--wide">
            <p className="landing-section-eyebrow">Who it supports</p>
            <h2 id="supports-title" className="landing-section-title">
              Built around real practice, not a perfect streak.
            </h2>
            <p className="landing-section-copy">
              Use Grip Restore as part of the routine you and your care team
              decide. Start small, repeat what feels useful, and stop when you
              need to.
            </p>
          </div>
          <div className="landing-support-grid">
            {supportCards.map((card, index) => (
              <article key={card.title} className="landing-support-card">
                <span className="landing-support-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-how" aria-labelledby="how-title">
          <div className="landing-section-intro landing-section-intro--wide">
            <p className="landing-section-eyebrow">How it works</p>
            <h2 id="how-title" className="landing-section-title">
              From first sign-in to your next session.
            </h2>
          </div>
          <ol className="landing-steps">
            {steps.map((step, index) => (
              <li key={step.title} className="landing-step">
                <span className="landing-step-number" aria-hidden="true">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="safety" className="landing-safety" aria-labelledby="safety-title">
          <div className="landing-safety-intro">
            <p className="landing-section-eyebrow">Safety and privacy</p>
            <h2 id="safety-title" className="landing-section-title">
              Comfortable practice, private by design.
            </h2>
          </div>
          <div className="landing-safety-grid">
            <article className="landing-safety-card">
              <h3>Your camera stays yours</h3>
              <p>Hand tracking runs in your browser. Grip Restore does not store video.</p>
            </article>
            <article className="landing-safety-card">
              <h3>Move at your pace</h3>
              <p>Stop if you feel pain, tingling, or soreness. Rest whenever you need to.</p>
            </article>
            <article className="landing-safety-card">
              <h3>Part of your care</h3>
              <p>
                Use Grip Restore alongside the plan you and your care team
                choose. It is not a diagnosis or a replacement for therapy.
              </p>
            </article>
          </div>
        </section>

        <section className="landing-final" aria-labelledby="final-title">
          <div>
            <p className="landing-final-eyebrow">Start here</p>
            <h2 id="final-title" className="landing-final-title">
              Start with a short session.
            </h2>
            <p className="landing-final-copy">
              Create an account to begin, or sign in to continue where you left off.
            </p>
          </div>
          <div className="landing-final-actions">
            <Button fullWidth={false} onClick={startAction}>{startLabel}</Button>
            {!isAuthenticated && (
              <Button fullWidth={false} variant="ghost" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Grip Restore</span>
        <span>Exercise aid, not medical advice.</span>
      </footer>
    </div>
  )
}
