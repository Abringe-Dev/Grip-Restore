import { useContext } from 'react'
import { HandTrackingContext } from './handTrackingContext'

export function useHandTracking() {
  const ctx = useContext(HandTrackingContext)
  if (!ctx) {
    throw new Error('useHandTracking must be used within a HandTrackingProvider')
  }
  return ctx
}