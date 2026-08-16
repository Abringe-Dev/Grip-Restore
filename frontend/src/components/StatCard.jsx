import './StatCard.css'

export default function StatCard({ label, value, caption, tone = 'primary' }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-caption">{caption}</span>
    </div>
  )
}