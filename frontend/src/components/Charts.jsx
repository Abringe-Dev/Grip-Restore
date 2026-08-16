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