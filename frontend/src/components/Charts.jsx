import './Charts.css'

const WIDTH = 600
const HEIGHT = 220
const PAD = { top: 16, right: 16, bottom: 32, left: 36 }

export function AccuracyTrendChart({ data }) {
  const max = 100
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const stepX = innerW / (data.length - 1)
  const y = (v) => PAD.top + innerH - (v / max) * innerH
  const x = (i) => PAD.left + i * stepX

  const points = data.map((d, i) => `${x(i)},${y(d.accuracy)}`).join(' ')
  const area = `${PAD.left},${PAD.top + innerH} ${points} ${x(data.length - 1)},${PAD.top + innerH}`

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Your accuracy over the last seven weeks"
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B8DEF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#5B8DEF" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            y1={y(v)}
            x2={WIDTH - PAD.right}
            y2={y(v)}
            className="chart-grid"
          />
          <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="chart-axis-label">
            {v}%
          </text>
        </g>
      ))}

      <polygon points={area} fill="url(#trend-fill)" />
      <polyline points={points} fill="none" className="chart-line" />

      {data.map((d, i) => (
        <circle key={d.week} cx={x(i)} cy={y(d.accuracy)} r="4" className="chart-dot">
          <title>{`Week ${i + 1}: ${d.accuracy}%`}</title>
        </circle>
      ))}

      {data.map((d, i) => (
        <text
          key={`label-${d.week}`}
          x={x(i)}
          y={HEIGHT - 8}
          textAnchor="middle"
          className="chart-axis-label"
        >
          {d.week}
        </text>
      ))}
    </svg>
  )
}

export function MissesByGestureChart({ data = [] }) {
  const rows = Array.isArray(data) ? data : []
  const totalAttempts = rows.reduce((sum, item) => sum + (Number(item.attempts) || 0), 0)
  const totalMisses = rows.reduce((sum, item) => sum + (Number(item.misses) || 0), 0)

  if (totalAttempts === 0) {
    return (
      <p className="chart-empty">
        No per-gesture results yet. This chart fills in after a completed game session.
      </p>
    )
  }

  if (totalMisses === 0) {
    return (
      <p className="chart-empty chart-empty--positive">
        No missed gestures in this period. Every attempt was a hit.
      </p>
    )
  }

  return (
    <div className="miss-chart" role="list" aria-label="Missed gestures by grip">
      {rows.map((item) => {
        const misses = Math.max(0, Number(item.misses) || 0)
        const share = Math.round((misses * 100) / totalMisses)
        return (
          <div
            key={item.key}
            className="miss-chart-row"
            role="listitem"
            style={{ '--gesture-color': item.color }}
            aria-label={`${item.label}: ${misses} ${misses === 1 ? 'miss' : 'misses'}, ${share}% of all misses`}
          >
            <span className="miss-chart-label">
              <span className="miss-chart-emoji" aria-hidden="true">{item.emoji}</span>
              {item.label}
            </span>
            <span className="miss-chart-track" aria-hidden="true">
              <span className="miss-chart-fill" style={{ width: `${share}%` }} />
            </span>
            <span className="miss-chart-value">
              {misses}
              <span className="miss-chart-share">{share}%</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function HitsMissesChart({ data = [] }) {
  const rows = Array.isArray(data) ? data : []
  const max = Math.max(1, ...rows.map((item) => (Number(item.hits) || 0) + (Number(item.misses) || 0)))
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const slot = innerW / Math.max(1, rows.length)
  const barW = Math.min(44, slot * 0.55)
  const y = (value) => PAD.top + innerH - (value / max) * innerH
  const ticks = [...new Set([0, Math.round(max / 2), max])]

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Hits and misses per week"
    >
      {ticks.map((value) => (
        <g key={value}>
          <line
            x1={PAD.left}
            y1={y(value)}
            x2={WIDTH - PAD.right}
            y2={y(value)}
            className="chart-grid"
          />
          <text x={PAD.left - 8} y={y(value) + 4} textAnchor="end" className="chart-axis-label">
            {value}
          </text>
        </g>
      ))}

      {rows.map((item, index) => {
        const hits = Math.max(0, Number(item.hits) || 0)
        const misses = Math.max(0, Number(item.misses) || 0)
        const total = hits + misses
        const cx = PAD.left + slot * index + slot / 2
        const hitsHeight = (hits / max) * innerH
        const missesHeight = (misses / max) * innerH
        const hitsY = PAD.top + innerH - hitsHeight
        const missesY = hitsY - missesHeight
        const x = cx - barW / 2

        return (
          <g key={item.week}>
            {hits > 0 && (
              <rect
                x={x}
                y={hitsY}
                width={barW}
                height={hitsHeight}
                rx="6"
                className="chart-bar chart-bar--hits"
              >
                <title>{`Week ${index + 1}: ${hits} hits`}</title>
              </rect>
            )}
            {misses > 0 && (
              <rect
                x={x}
                y={missesY}
                width={barW}
                height={missesHeight}
                rx="6"
                className="chart-bar chart-bar--misses"
              >
                <title>{`Week ${index + 1}: ${misses} misses`}</title>
              </rect>
            )}
            {total > 0 && (
              <text x={cx} y={missesY - 6} textAnchor="middle" className="chart-value-label">
                {total}
              </text>
            )}
            <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="chart-axis-label">
              {item.week}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function SessionsBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.sessions)) + 1
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const slot = innerW / data.length
  const barW = Math.min(36, slot * 0.5)
  const y = (v) => PAD.top + innerH - (v / max) * innerH

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Sessions completed per week"
    >
      <line
        x1={PAD.left}
        y1={PAD.top + innerH}
        x2={WIDTH - PAD.right}
        y2={PAD.top + innerH}
        className="chart-grid"
      />

      {data.map((d, i) => {
        const cx = PAD.left + slot * i + slot / 2
        const bh = (d.sessions / max) * innerH
        return (
          <g key={d.week}>
            <rect
              x={cx - barW / 2}
              y={y(d.sessions)}
              width={barW}
              height={bh}
              rx="8"
              className="chart-bar"
            >
              <title>{`Week ${i + 1}: ${d.sessions} sessions`}</title>
            </rect>
            <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="chart-axis-label">
              {d.week}
            </text>
            <text x={cx} y={y(d.sessions) - 6} textAnchor="middle" className="chart-value-label">
              {d.sessions}
            </text>
          </g>
        )
      })}
    </svg>
  )
}