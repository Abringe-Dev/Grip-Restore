import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { WebcamContext } from './webcamContext'

const SESSION_PATHS = ['/setup', '/calibration', '/game']

export function WebcamProvider({ children }) {
  const location = useLocation()
  const [status, setStatus] = useState('idle')
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const streamRef = useRef(null)
  const requestingRef = useRef(false)

  const stop = useCallback(() => {
    requestingRef.current = false
    const active = streamRef.current
    if (active) {
      active.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setStatus('idle')
    setError(null)
  }, [])

  const start = useCallback(async () => {
    if (requestingRef.current || streamRef.current) return
    requestingRef.current = true
    setStatus('requesting')
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      requestingRef.current = false
      setStatus('unsupported')
      return
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      streamRef.current = newStream
      setStream(newStream)
      setStatus('active')
    } catch (err) {
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setStatus('denied')
      } else {
        setStatus('error')
        setError(err && err.message ? err.message : 'Could not access your camera.')
      }
    } finally {
      requestingRef.current = false
    }
  }, [])

  useEffect(() => {
    return () => {
      const active = streamRef.current
      if (active) {
        active.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (SESSION_PATHS.includes(location.pathname)) return
    const active = streamRef.current
    if (!active) return
    active.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    queueMicrotask(() => {
      setStream(null)
      setStatus('idle')
      setError(null)
    })
  }, [location.pathname])

  return (
    <WebcamContext.Provider value={{ status, stream, error, start, stop }}>
      {children}
    </WebcamContext.Provider>
  )
}