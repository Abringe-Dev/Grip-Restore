import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import './../styles/guide.css'
import './../styles/user-guide.css'

const journey = [
  {
    to: '/account',
    label: 'Account',
    detail: 'Sign in and keep your details secure',
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    detail: 'See this week and your next step',
  },
  {
    to: '/start-session',
    label: 'Session',
    detail: 'Set up, calibrate, and play',
  },
  {
    to: '/history',
    label: 'Progress',
    detail: 'Review results and build your plan',
  },
]

const guideSections = [
  { id: 'account', label: 'Account' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'start-session', label: 'Start a session' },
  { id: 'camera', label: 'Camera setup' },
  { id: 'play', label: 'During play' },
  { id: 'practice', label: 'Practice' },
  { id: 'plan', label: 'Week plan' },
  { id: 'history', label: 'History' },
  { id: 'privacy', label: 'Privacy and safety' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
]

function GuideSection({ id, step, title, to, linkLabel, children }) {
  return (
    <section id={id} className="guide-section user-guide-section" aria-labelledby={`${id}-title`}>
      <header className="user-guide-section-head">
        <span className="user-guide-step" aria-hidden="true">{step}</span>
        <h2 id={`${id}-title`} className="guide-section-title">{title}</h2>
      </header>
      {children}
      <Link className="user-guide-link" to={to}>
        {linkLabel}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </section>
  )
}

export default function UserGuide() {
  const navigate = useNavigate()

  return (
    <main className="guide-main user-guide-main">
      <section className="guide-hero">
        <p className="guide-eyebrow">User guide</p>
        <h1 className="guide-title">How Grip Restore works</h1>
        <p className="guide-sub">
          A tour of the whole system, from your account and camera setup to
          practice, progress, and your weekly plan.
        </p>
      </section>

      <section className="guide-section user-guide-journey" aria-labelledby="journey-title">
        <div className="user-guide-journey-head">
          <h2 id="journey-title" className="guide-section-title">Your path through Grip Restore</h2>
          <p>
            Follow the same loop each time: sign in, check your dashboard, complete
            a session, then review what changed.
          </p>
        </div>
        <ol className="user-guide-flow">
          {journey.map((step, index) => (
            <li key={step.to} className="user-guide-flow-step">
              <Link className="user-guide-flow-link" to={step.to}>
                <span className="user-guide-flow-number" aria-hidden="true">{index + 1}</span>
                <span className="user-guide-flow-label">{step.label}</span>
                <span className="user-guide-flow-detail">{step.detail}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <nav className="user-guide-toc" aria-label="Guide sections">
        <p className="user-guide-toc-title">In this guide</p>
        <div className="user-guide-toc-links">
          {guideSections.map((section) => (
            <a key={section.id} className="user-guide-toc-link" href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="guide-content">
        <GuideSection
          id="account"
          step="1"
          title="Account and sign-in"
          to="/account"
          linkLabel="Open your account"
        >
          <p>
            Create an account, verify your email, then sign in. Your sessions,
            practice results, and weekly plan are tied to this account. If you
            forget your password, use the reset link on the sign-in page.
          </p>
          <ul className="guide-list">
            <li><strong>Profile:</strong> your name, email, and verification status.</li>
            <li><strong>Change password:</strong> use at least eight characters.</li>
            <li><strong>Sign out of all devices:</strong> use this after a shared or public computer.</li>
          </ul>
        </GuideSection>

        <GuideSection
          id="dashboard"
          step="2"
          title="Dashboard"
          to="/dashboard"
          linkLabel="Go to your dashboard"
        >
          <p>
            The dashboard is your home base. It summarizes this week, suggests a
            comfortable next session, and lets you jump straight into one grip.
          </p>
          <ul className="guide-list">
            <li>Weekly accuracy, sessions completed, and best streak.</li>
            <li>A next-session card with duration, difficulty, expected accuracy, and focus grips.</li>
            <li>Quick practice shortcuts for Pinch, Fist, and Open Palm.</li>
          </ul>
        </GuideSection>

        <GuideSection
          id="start-session"
          step="3"
          title="Start a session"
          to="/start-session"
          linkLabel="Choose a session"
        >
          <p>
            Pick a 5-minute quick session or a 10-minute standard session, then
            choose a difficulty. Grip Restore suggests a difficulty from your
            recent sessions, but you can choose another.
          </p>
          <p>
            Select <strong>Begin Session</strong> when you are ready. The next
            steps are camera setup and calibration, followed by the game.
          </p>
        </GuideSection>

        <GuideSection
          id="camera"
          step="4"
          title="Camera setup and calibration"
          to="/start-session"
          linkLabel="Start the setup flow"
        >
          <p>
            Allow camera access when your browser asks. Keep your hand about an
            arm&rsquo;s length from the screen, use even lighting, and keep your
            palm facing the camera. The preview is mirrored so movement feels
            natural.
          </p>
          <p>
            Calibration asks you to hold Pinch, Fist, and Open Palm for two
            seconds each. This helps the app recognize your hand. You can skip a
            calibration step if you need to.
          </p>
        </GuideSection>

        <GuideSection
          id="play"
          step="5"
          title="During play"
          to="/instructions"
          linkLabel="Open How to Play"
        >
          <p>
            Notes fall in three lanes. Form the matching gesture as a note reaches
            the target and hit band. A hit lands inside the timing window; a miss
            happens after it. Accuracy is hits divided by total attempts.
          </p>
          <p>
            If the camera or hand tracking pauses, the game shows a paused
            overlay. Use the retry option in the camera card to continue. At the
            end, the summary shows hits, misses, accuracy, and per-gesture
            results. Quitting early still saves the time you completed.
          </p>
        </GuideSection>

        <GuideSection
          id="practice"
          step="6"
          title="Practice one grip"
          to="/practice"
          linkLabel="Open Practice"
        >
          <p>
            Practice mode lets you focus on Pinch, Fist, or Open Palm. Hold the
            chosen grip for two seconds to score a success. Releasing early or
            changing grip ends the attempt.
          </p>
          <p>
            Three successes in a row suggest a full session. Practice accuracy
            and streaks are saved to your account.
          </p>
        </GuideSection>

        <GuideSection
          id="plan"
          step="7"
          title="Your weekly plan"
          to="/plan"
          linkLabel="View your week plan"
        >
          <p>
            The week plan uses recent sessions to forecast next-session accuracy
            and choose a focus. It reviews your last five sessions overall and
            each grip across its last three sessions.
          </p>
          <p>
            Grips below 75% with at least three attempts get extra focus.
            Sessions sit on alternating days to leave recovery time. Start a
            planned session or practice its focus grip from the plan.
          </p>
        </GuideSection>

        <GuideSection
          id="history"
          step="8"
          title="History and progress"
          to="/history"
          linkLabel="Open your history"
        >
          <p>
            History is where you check progress over time. It shows weekly
            accuracy, sessions completed, best streak, an accuracy trend, and
            sessions per week.
          </p>
          <p>
            Recent sessions list the date, mode, hits, misses, accuracy, and
            duration. Per-gesture results help you see which grips need more
            attention.
          </p>
        </GuideSection>

        <GuideSection
          id="privacy"
          step="9"
          title="Privacy and account safety"
          to="/account"
          linkLabel="Review account settings"
        >
          <p>
            Camera frames are processed in your browser for hand tracking. Grip
            Restore saves session summaries and practice results to your account;
            it does not store video in the app.
          </p>
          <p>
            Use a unique password, verify your email, and sign out of all devices
            on shared computers. Your progress is personal, so use the app on a
            device you trust.
          </p>
        </GuideSection>

        <GuideSection
          id="troubleshooting"
          step="10"
          title="If something is not working"
          to="/account"
          linkLabel="Check your account"
        >
          <ul className="guide-list">
            <li><strong>Camera blocked:</strong> allow camera access in your browser&rsquo;s site settings, then retry.</li>
            <li><strong>Hand not detected:</strong> move your hand into frame, improve lighting, and avoid a busy background.</li>
            <li><strong>Tracking paused:</strong> use the retry option in the camera card.</li>
            <li><strong>Verification email missing:</strong> check your spam folder or resend it from the sign-in page.</li>
            <li><strong>Progress missing:</strong> confirm you are signed in to the account used for the session.</li>
          </ul>
        </GuideSection>
      </div>

      <section className="guide-section guide-section--safety user-guide-safety" aria-labelledby="safety-title">
        <h2 id="safety-title" className="guide-section-title">Keep it comfortable</h2>
        <p>
          Move slowly and stop if you feel pain, tingling, or soreness. Grip
          Restore is an exercise aid, not medical advice. Check with a clinician
          if symptoms continue.
        </p>
      </section>

      <section className="guide-cta">
        <p>Ready to put the guide into practice?</p>
        <div className="guide-cta-actions">
          <Button fullWidth={false} onClick={() => navigate('/start-session')}>
            Start a session
          </Button>
          <Button fullWidth={false} variant="ghost" onClick={() => navigate('/practice')}>
            Practice a grip
          </Button>
          <Button fullWidth={false} variant="ghost" onClick={() => navigate('/instructions')}>
            How to Play
          </Button>
        </div>
      </section>
    </main>
  )
}
