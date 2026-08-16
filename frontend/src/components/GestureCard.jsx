import './GestureCard.css'

export default function GestureCard({ emoji, label, color }) {
  return (
    <div className="gesture-card" style={{ background: color }}>
      <span className="gesture-card-emoji" aria-hidden="true">{emoji}</span>
      <span className="gesture-card-label">{label}</span>
    </div>
  )
}