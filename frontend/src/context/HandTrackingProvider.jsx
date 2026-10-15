import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HandTrackingContext } from './handTrackingContext'
import { useWebcam } from './useWebcam'
import { SESSION_PATHS } from '../constants/sessionPaths'
import { createHandLandmarker, detectHands } from '../vision/handLandmarker'
import { drawHandSkeleton } from '../vision/drawSkeleton'
import { classifyGesture, PINCH_ENTER_RATIO, PINCH_EXIT_RATIO } from '../vision/classifyGesture'

const FPS_WINDOW_MS = 500
const GESTURE_CONFIRM_FRAMES = 3

function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
}

export function HandTrackingProvider({ children }) {
  const location = useLocation()
  const { stream } = useWebcam()
  const [trackingStatus, setTrackingStatus] = useState('idle')
  const [handsDetected, setHandsDetected] = useState(false)
  const [fps, setFps] = useState(0)
  const [error, setError] = useState(null)
  const [currentGesture, setCurrentGesture] = useState('none')
  const [gestureConfidence, setGestureConfidence] = useState(0.5)

  const landmarkerRef = useRef(null)
  const connectionsRef = useRef([])
  const loadingRef = useRef(null)
  const rafRef = useRef(0)
  const trackingRef = useRef(false)
  const landmarksRef = useRef([])
  const gestureRef = useRef({ gesture: 'none', confidence: 0.5 })
  const stableGestureRef = useRef('none')
  const stableConfidenceRef = useRef(0.5)
  const candidateRef = useRef('none')
  const candidateCountRef = useRef(0)
  const pinchActiveRef = useRef(false)
  const canvasesRef = useRef(new Set())
  const hiddenVideoRef = useRef(null)
  const cursorRef = useRef({ lastVideoTime: -1, lastTimestamp: 0 })
  const framesRef = useRef(0)
  const fpsTimeRef = useRef(0)
  const handsRef = useRef(false)

  const clearGestureRefs = () => {
    gestureRef.current = { gesture: 'none', confidence: 0.5 }
    stableGestureRef.current = 'none'
    stableConfidenceRef.current = 0.5
    candidateRef.current = 'none'
    candidateCountRef.current = 0
    pinchActiveRef.current = false
  }

  const stopTracking = useCallback(() => {
    trackingRef.current = false
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    landmarksRef.current = []
    handsRef.current = false
    clearGestureRefs()
    canvasesRef.current.forEach(clearCanvas)
    queueMicrotask(() => {
      setTrackingStatus('idle')
      setHandsDetected(false)
      setFps(0)
      setCurrentGesture('none')
      setGestureConfidence(0.5)
    })
  }, [])

  const loopRef = useRef(null)

  const getLoop = useCallback(() => {
    if (!loopRef.current) {
      loopRef.current = () => {
        if (!trackingRef.current) return
        const landmarker = landmarkerRef.current
        const video = hiddenVideoRef.current
        if (landmarker && video) {
          let hands = []
          let counted = false
          try {
            const result = detectHands(landmarker, video, cursorRef.current)
            if (result) {
              framesRef.current += 1
              counted = true
              hands = result.landmarks ?? []
            }
          } catch {
            framesRef.current += 1
            counted = true
            hands = []
          }
          landmarksRef.current = hands
          if (counted) {
            const threshold = pinchActiveRef.current ? PINCH_EXIT_RATIO : PINCH_ENTER_RATIO
            const raw = hands.length > 0
              ? classifyGesture(hands[0], threshold)
              : { gesture: 'none', confidence: 0.5 }
            pinchActiveRef.current = raw.gesture === 'pinch'
            gestureRef.current = raw
            if (raw.gesture === candidateRef.current) {
              candidateCountRef.current += 1
            } else {
              candidateRef.current = raw.gesture
              candidateCountRef.current = 1
            }
            if (candidateCountRef.current >= GESTURE_CONFIRM_FRAMES) {
              if (raw.gesture !== stableGestureRef.current) {
                stableGestureRef.current = raw.gesture
                stableConfidenceRef.current = raw.confidence
                setCurrentGesture(raw.gesture)
                setGestureConfidence(raw.confidence)
              } else if (raw.confidence !== stableConfidenceRef.current) {
                stableConfidenceRef.current = raw.confidence
                setGestureConfidence(raw.confidence)
              }
            }
          }

          const detected = hands.length > 0
          if (detected !== handsRef.current) {
            handsRef.current = detected
            setHandsDetected(detected)
          }

          const frameW = video.videoWidth
          const frameH = video.videoHeight
          canvasesRef.current.forEach((canvas) => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
            const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
              canvas.width = w
              canvas.height = h
            }
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            if (frameW > 0 && frameH > 0) {
              hands.forEach((landmarks) => {
                drawHandSkeleton(ctx, landmarks, frameW, frameH, canvas.width, canvas.height, connectionsRef.current)
              })
            }
          })
          const now = performance.now()
          if (now - fpsTimeRef.current >= FPS_WINDOW_MS) {
            const elapsed = now - fpsTimeRef.current
            fpsTimeRef.current = now
            const value = Math.round((framesRef.current * 1000) / Math.max(elapsed, 1))
            framesRef.current = 0
            setFps((prev) => (prev === value ? prev : value))
          }
        }
        rafRef.current = requestAnimationFrame(loopRef.current)
      }
    }
    return loopRef.current
  }, [])

  const startTracking = useCallback(() => {
    if (trackingRef.current) return Promise.resolve()
    if (loadingRef.current) {
      trackingRef.current = true
      setTrackingStatus('loading')
      setError(null)
      return loadingRef.current
    }
    trackingRef.current = true
    if (landmarkerRef.current) {
      setTrackingStatus('active')
      setError(null)
      landmarksRef.current = []
      clearGestureRefs()
      setCurrentGesture('none')
      setGestureConfidence(0.5)
      framesRef.current = 0
      fpsTimeRef.current = performance.now()
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(getLoop())
      }
      return Promise.resolve()
    }
    setTrackingStatus('loading')
    setError(null)
    const job = (async () => {
      try {
        const { landmarker, HandLandmarker } = await createHandLandmarker()
        if (!trackingRef.current) {
          try {
            landmarker.close()
          } catch {
            /* already released */
          }
          return
        }
        landmarkerRef.current = landmarker
        connectionsRef.current = HandLandmarker.HAND_CONNECTIONS ?? []
        landmarksRef.current = []
        clearGestureRefs()
        setCurrentGesture('none')
        setGestureConfidence(0.5)
        framesRef.current = 0
        fpsTimeRef.current = performance.now()
        setTrackingStatus('active')
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(getLoop())
        }
      } catch (err) {
        trackingRef.current = false
        setTrackingStatus('error')
        setError(err && err.message ? err.message : 'Could not start hand tracking.')
      } finally {
        loadingRef.current = null
      }
    })()
    loadingRef.current = job
    return job
  }, [getLoop])

  const registerOverlay = useCallback((canvas) => {
    if (canvas) canvasesRef.current.add(canvas)
  }, [])

  const unregisterOverlay = useCallback((canvas) => {
    if (canvas) {
      clearCanvas(canvas)
      canvasesRef.current.delete(canvas)
    }
  }, [])

  useEffect(() => {
    const video = hiddenVideoRef.current
    if (!video) return
    if (stream) {
      video.muted = true
      video.srcObject = stream
      video.play().catch(() => {})
    } else {
      video.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    if (SESSION_PATHS.includes(location.pathname)) return
    if (!trackingRef.current && !landmarkerRef.current) return
    stopTracking()
  }, [location.pathname, stopTracking])

  useEffect(() => {
    return () => {
      trackingRef.current = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close()
        } catch {
          /* already released */
        }
        landmarkerRef.current = null
      }
    }
  }, [])

  return (
    <HandTrackingContext.Provider
      // Consumer guidance: bind UI to currentGesture/gestureConfidence
      // (3-frame confirmed, flicker-free). gestureRef is raw per-frame output
      // for low-latency readers only (e.g. hold-timing in Feature 3).
      value={{ trackingStatus, handsDetected, fps, error, landmarksRef, gestureRef, currentGesture, gestureConfidence, startTracking, stopTracking, registerOverlay, unregisterOverlay }}
    >
      <video
        ref={hiddenVideoRef}
        muted
        playsInline
        autoPlay
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: 'fixed', bottom: 0, left: 0, width: 2, height: 2, opacity: 0, pointerEvents: 'none' }}
      />
      {children}
    </HandTrackingContext.Provider>
  )
}