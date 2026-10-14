import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import WebcamCard from '../components/WebcamCard'
import { useWebcam } from '../context/useWebcam'
import { useHandTracking } from '../context/useHandTracking'
import './../styles/setup.css'

export default function Setup() {
  const navigate = useNavigate()
  const { status, stream, start } = useWebcam()
  const { startTracking } = useHandTracking()

  useEffect(() => {
    start()
    startTracking()
  }, [start, startTracking])

  const handleRetry = useCallback(() => {
    start()
    startTracking()
  }, [start, startTracking])

  const ready = status === 'active'

  return (
    <main className="setup-main">
      <div className="setup-text">
        <h1 className="setup-title">Hey there!</h1>
        <p className="setup-sub">
          Grip Restore uses your webcam to track your hand movements during
          the exercise.
        </p>
      </div>
      <WebcamCard glow="teal" status={status} stream={stream} onRetry={handleRetry} />
      <p className="setup-hint">
        {ready ? 'Click proceed to continue' : 'Allow camera access to continue'}
      </p>
      <Button onClick={() => navigate('/calibration')} disabled={!ready}>
        Proceed
      </Button>
    </main>
  )
}