import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import GuideContent from './GuideContent'
import { useAuth } from '../context/useAuth'
import { hasSeenGuide, markGuideSeen } from '../data/guide'
import './../styles/guide.css'

export default function FirstRunGuide() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(() => Boolean(userId) && !hasSeenGuide(userId))
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return undefined
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [open])

  const dismiss = useCallback(() => {
    if (userId) markGuideSeen(userId)
    setOpen(false)
  }, [userId])

  const openFullGuide = () => {
    dismiss()
    navigate('/instructions')
  }

  const handleBackdrop = (event) => {
    if (event.target === dialogRef.current) dismiss()
  }

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="guide-dialog"
      aria-labelledby="first-run-title"
      aria-describedby="first-run-intro"
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      onClick={handleBackdrop}
    >
      <div className="guide-dialog-panel">
        <header className="guide-dialog-head">
          <div>
            <p className="guide-dialog-eyebrow">First visit</p>
            <h2 id="first-run-title" className="guide-dialog-title">Welcome to Grip Restore</h2>
          </div>
          <button type="button" className="guide-dialog-close" aria-label="Close guide" onClick={dismiss}>
            &times;
          </button>
        </header>

        <div className="guide-dialog-body">
          <p id="first-run-intro" className="guide-dialog-intro">
            Here&rsquo;s the short version of how sessions, practice, and your
            weekly plan fit together.
          </p>
          <GuideContent compact />
        </div>

        <footer className="guide-dialog-actions">
          <Button fullWidth={false} onClick={dismiss}>Got it, let&rsquo;s go</Button>
          <Button fullWidth={false} variant="ghost" onClick={openFullGuide}>
            Read the full guide
          </Button>
        </footer>
      </div>
    </dialog>
  )
}
