import { useEffect, useRef } from 'react'
import './WebcamCard.css'

function CameraIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 8h14v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M16 11l5-3v8l-5-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

export default function WebcamCard({ glow = 'teal', status = 'idle', stream = null, onRetry }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (video && stream) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [stream])

  let content

  if (status === 'active' && stream) {
    content = (
      <video ref={videoRef} className="webcam-video" autoPlay playsInline muted aria-label="Your camera preview" />
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