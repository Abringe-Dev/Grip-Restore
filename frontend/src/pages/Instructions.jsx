import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import GuideContent from '../components/GuideContent'
import './../styles/guide.css'

export default function Instructions() {
  const navigate = useNavigate()

  return (
    <main className="guide-main">
      <section className="guide-hero">
        <h1 className="guide-title">How to play</h1>
        <p className="guide-sub">
          Everything you need for a comfortable, useful session — from camera
          setup to your weekly plan.
        </p>
      </section>

      <GuideContent />

      <section className="guide-cta">
        <p>Ready when you are.</p>
        <div className="guide-cta-actions">
          <Button fullWidth={false} onClick={() => navigate('/start-session')}>
            Start a session
          </Button>
          <Button fullWidth={false} variant="ghost" onClick={() => navigate('/practice')}>
            Practise a grip
          </Button>
        </div>
      </section>
    </main>
  )
}
