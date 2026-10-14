import { useEffect, useRef } from 'react'
import { useHandTracking } from '../context/useHandTracking'
import './WebcamCard.css'

function CameraIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 8h14v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M16 11l5-3v8l-5-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function TrackingBadge() {
  const { trackingStatus, handsDetected, fps, startTracking } = useHandTracking()

  if (trackingStatus === 'active') {
    return (
      <div className="webcam-debug-badge" aria-live="off">
        {fps} fps &middot; {handsDetected ? '1 hand' : 'no hand'}
      </div>
    )
  }
  if (trackingStatus === 'loading') {
    return (
      <div className="webcam-debug-badge" aria-live="off">
        loading hand tracking&hellip;
      </div>
    )
  }
  if (trackingStatus === 'error') {
    return (
      <div className="webcam-debug-badge webcam-debug-badge--warn" aria-live="off">
        tracking unavailable
        <button type="button" className="webcam-badge-retry" onClick={startTracking}>
          retry
        </button>
      </div>
    )
  }
  return null
}

export default function WebcamCard({ glow = 'teal', status = 'idle', stream = null, onRetry }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const { registerOverlay, unregisterOverlay } = useHandTracking()

  useEffect(() => {
    const video = videoRef.current
    if (video && stream) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [stream])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || status !== 'active' || !stream) return
    registerOverlay(canvas)
    return () => unregisterOverlay(canvas)
  }, [registerOverlay, unregisterOverlay, status, stream])

  let content

  if (status === 'active' && stream) {
    content = (
      <>
        <video ref={videoRef} className="webcam-video" autoPlay playsInline muted aria-label="Your camera preview" />
        <canvas ref={canvasRef} className="webcam-overlay" aria-hidden="true" />
        <TrackingBadge />
      </>
    )
  } else if (status === 'requesting') {
    content = (
      <div className="webcam-placeholder">
        <span className="webcam-spinner" aria-hidden="true" />
        <span>Turning on your camera&hellip;</span>
      </div>
    )
  } else if (status === 'denied') {
    content = (
      <div className="webcam-placeholder webcam-message">
        <CameraIcon />
        <span>Camera access was denied. To continue, allow the camera in your browser settings.</span>
        {onRetry && (
          <button type="button" className="webcam-retry" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    )
  } else if (status === 'unsupported') {
    content = (
      <div className="webcam-placeholder webcam-message">
        <CameraIcon />
        <span>Your browser doesn&rsquo;t support camera access.</span>
      </div>
    )
  } else if (status === 'error') {
    content = (
      <div className="webcam-placeholder webcam-message">
        <CameraIcon />
        <span>We couldn&rsquo;t access your camera. Please try again.</span>
        {onRetry && (
          <button type="button" className="webcam-retry" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    )
  } else {
    content = (
      <div className="webcam-placeholder">
        <CameraIcon />
        <span>Camera preview will appear here</span>
      </div>
    )
  }

  return <div className={`webcam-card webcam-card--${glow}`}>{content}</div>
}