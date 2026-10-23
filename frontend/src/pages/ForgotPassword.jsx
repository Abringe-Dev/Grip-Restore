import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import Input from '../components/Input'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export default function ForgotPassword() {
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()

    const next = {}
    if (!email) next.email = 'Please enter your email.'
    else if (!EMAIL_PATTERN.test(email)) next.email = 'That email doesn’t look right — try again.'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      setSent(await requestPasswordReset(email))
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Grip Restore"
      eyebrow="Forgot password?"
      subtitle="We’ll email you a secure link to choose a new password."
    >
      <h2 className="auth-card-title">Reset your password</h2>
      {sent ? (
        <>
          <div className="auth-notice" role="status">
            <p>{sent.message}</p>
            {sent.devResetUrl && (
              <p>
                <a className="auth-link" href={sent.devResetUrl}>
                  Open reset link (dev)
                </a>
              </p>
            )}
          </div>
          <p className="auth-switch">
            <Link to="/login">Back to log in</Link>
          </p>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            name="email"
            type="email"
            label="Email"
            error={errors.email}
            autoComplete="email"
          />

          {formError && (
            <p className="auth-notice auth-notice--error" role="alert">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
      {!sent && (
        <p className="auth-switch">
          Remembered it? <Link to="/login">Log in</Link>
        </p>
      )}
    </AuthLayout>
  )
}
