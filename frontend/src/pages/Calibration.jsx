import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
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

const HOLD_MS = 2000
const TICK_MS = 100
const NICE_MS = 600

function round2(v) {
  return Math.round(v * 100) / 100
}

function CalibrationStep({ gestureKey, instruction, color, stepIndex, stepTotal, onDone }) {
  const { currentGesture, gestureConfidence, trackingStatus } = useHandTracking()
  const [heldMs, setHeldMs] = useState(0)
  const [showNice, setShowNice] = useState(false)
  const heldRef = useRef(0)
  const confSumRef = useRef(0)
  const confTicksRef = useRef(0)
  const doneRef = useRef(false)
  const timeoutRef = useRef(0)
  const tracking = trackingStatus === 'active'

  const handleSkip = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone({
      gesture: gestureKey,
      heldMs: heldRef.current,
      meanConfidence: confTicksRef.current > 0 ? round2(confSumRef.current / confTicksRef.current) : null,
      skipped: true,
    })
  }

  const onTick = useEffectEvent(() => {
    if (doneRef.current) return
    if (currentGesture === gestureKey) {
      confSumRef.current += gestureConfidence
      confTicksRef.current += 1
      heldRef.current = Math.min(heldRef.current + TICK_MS, HOLD_MS)
      setHeldMs(heldRef.current)
      if (heldRef.current >= HOLD_MS) {
        doneRef.current = true
        setShowNice(true)
        timeoutRef.current = setTimeout(() => onDone({
          gesture: gestureKey,
          heldMs: HOLD_MS,
          meanConfidence: confTicksRef.current > 0 ? round2(confSumRef.current / confTicksRef.current) : null,
          skipped: false,
        }), NICE_MS)
      }
    } else {
      heldRef.current = 0
      confSumRef.current = 0
      confTicksRef.current = 0
      setHeldMs(0)
    }
  })

  useEffect(() => {
    if (!tracking) return undefined
    heldRef.current = 0
    confSumRef.current = 0
    confTicksRef.current = 0
    const id = setInterval(onTick, TICK_MS)
    return () => clearInterval(id)
  }, [tracking])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = 0
      }
    }
  }, [])

  const pct = Math.round((heldMs / HOLD_MS) * 100)

  return (
    <>
      <div className="calibration-instruction">
        Show a <strong style={{ color }}>{instruction}</strong> gesture
      </div>
      {showNice ? (
        <p className="calibration-hold is-nice" role="status">Nice!</p>
      ) : tracking ? (
        <>
          <div
            className="calibration-holdbar"
            role="progressbar"
            aria-label={`Hold ${gestureKey} progress`}
            aria-valuemin={0}
            aria-valuemax={HOLD_MS}
            aria-valuenow={heldMs}
          >
            <div className="calibration-holdbar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          <p className="calibration-hold">
            {heldMs > 0
              ? `holding ${gestureKey}… ${(heldMs / 1000).toFixed(1)}s / 2s`
              : `Show a ${gestureKey} gesture and hold`}
          </p>
        </>
      ) : (
        <p className="calibration-hold">Hold for 2 seconds</p>
      )}

      <div className="calibration-progress" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={stepTotal}>
        {steps.map((s, i) => (
          <span key={s.key} className={`calibration-dot${i <= stepIndex ? ' is-active' : ''}`} aria-hidden="true" />
        ))}
      </div>

      <Button onClick={handleSkip} color={color} className="calibration-next" disabled={showNice}>
        Skip
      </Button>
    </>
  )
}

export default function Calibration() {
  const navigate = useNavigate()
  const { status, stream, start } = useWebcam()
  const { startTracking } = useHandTracking()
  const [step, setStep] = useState(0)
  const current = steps[step]
  const resultsRef = useRef([])

  const handleRetry = useCallback(() => {
    start()
    startTracking()
  }, [start, startTracking])

  const handleDone = useCallback((result) => {
    resultsRef.current[step] = result
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
    } else {
      navigate('/game', { state: { calibration: [...resultsRef.current] } })
    }
  }, [step, navigate])

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

      <CalibrationStep
        key={current.key}
        gestureKey={current.key}
        instruction={current.instruction}
        color={current.color}
        stepIndex={step}
        stepTotal={steps.length}
        onDone={handleDone}
      />
    </main>
  )
}