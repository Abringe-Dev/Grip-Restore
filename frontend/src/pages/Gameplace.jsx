import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import './../styles/game.css'

export default function Gameplace() {
  const navigate = useNavigate()

  return (
    <main className="game-main">
      <div className="game-card">
        <span className="game-emoji" aria-hidden="true">🎵</span>
        <h1 className="game-title">Gameplay coming soon</h1>
        <p className="game-sub">
          Your hands are calibrated and ready. The rhythm session will appear
          right here.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    </main>
  )
}