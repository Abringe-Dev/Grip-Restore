import './GestureSummary.css'

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default function GestureSummary({
  items,
  className = '',
  label = 'Per-gesture results',
}) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <ul className={`gesture-summary${className ? ` ${className}` : ''}`} aria-label={label}>
      {items.map((item) => (
        <li
          key={item.key}
          className="gesture-summary-item"
          style={{ '--gesture-color': item.color }}
          aria-label={`${item.label}: ${countLabel(item.hits, 'hit', 'hits')}, ${countLabel(item.misses, 'miss', 'misses')}`}
        >
          <span className="gesture-summary-emoji" aria-hidden="true">{item.emoji}</span>
          <span className="gesture-summary-label">{item.label}</span>
          <span className="gesture-summary-hits">{item.hits} hit</span>
          <span className="gesture-summary-divider" aria-hidden="true">·</span>
          <span className="gesture-summary-misses">{item.misses} missed</span>
        </li>
      ))}
    </ul>
  )
}
