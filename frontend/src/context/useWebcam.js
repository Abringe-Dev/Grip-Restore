import { useContext } from 'react'
import { WebcamContext } from './webcamContext'

export function useWebcam() {
  const ctx = useContext(WebcamContext)
  if (!ctx) {
    throw new Error('useWebcam must be used within a WebcamProvider')
  }
  return ctx
}