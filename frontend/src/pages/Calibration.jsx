import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import WebcamCard from '../components/WebcamCard'
import GestureCard from '../components/GestureCard'
import { useWebcam } from '../context/useWebcam'
import { useHandTracking } from '../context/useHandTracking'
import './../styles/calibration.css'

const steps = [
  { key: 'pinch', emoji: '🤏🏻', label: 'Pinch', color: '#5B8DEF', glow: 'blue', instruction: 'pinch' },
  { key: 'fist', emoji: '✊🏻', label: 'Fist', color: '#8175D5', glow: 'purple', instruction: 'fist' },
  { key: 'palm', emoji: '🖐🏻', label: 'Open Palm', color: '#3FAE7A', glow: 'green', instruction: 'open palm' },
]

export default function Calibration() {
  const navigate = useNavigate()
  const { status, stream, start } = useWebcam()
  const { startTracking } = useHandTracking()
  const [step, setStep] = useState(0)
  const current = steps[step]

  const handleRetry = useCallback(() => {
    start()
    startTracking()
  }, [start, startTracking])

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
    } else {
      navigate('/game')
    }
  }

  return (
    <main className="calibration-main">
      <div className="calibration-text">
        <h1 className="calibration-title">Let&rsquo;s find your hand</h1>
        <p className="calibration-sub">
          Keep your hand steady and follow the instructions below.
        </p>
      </div>

      <div className="calibration-stage">
        <WebcamCard glow={current.glow} status={status} stream={stream} onRetry={handleRetry} />
        <GestureCard emoji={current.emoji} label={current.label} color={current.color} />
      </div>

      <div className="calibration-instruction">
        Show a <strong style={{ color: current.color }}>{current.instruction}</strong> gesture
      </div>
      <p className="calibration-hold">Hold for 2 seconds</p>

      <div className="calibration-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        {steps.map((s, i) => (
          <span key={s.key} className={`calibration-dot${i <= step ? ' is-active' : ''}`} aria-hidden="true" />
        ))}
      </div>

      <Button onClick={handleNext} color={current.color} className="calibration-next">
        Next
      </Button>
    </main>
  )
}