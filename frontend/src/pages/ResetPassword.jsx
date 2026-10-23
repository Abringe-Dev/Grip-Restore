import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import Input from '../components/Input'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') || '')
    const confirm = String(data.get('confirm') || '')

    const next = {}
    if (!password) next.password = 'Please choose a new password.'
    else if (password.length < 8) next.password = 'Use at least 8 characters for safety.'
    else if (password.length > 128) next.password = 'Use 128 characters or fewer.'
    if (!confirm) next.confirm = 'Please confirm your new password.'
    else if (confirm !== password) next.confirm = 'Those passwords don’t match.'

    setErrors(next)
    setFormError('')
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Grip Restore"
        eyebrow="Link problem"
        subtitle="This reset link is missing its token."
      >
        <h2 className="auth-card-title">Invalid reset link</h2>
        <p className="auth-notice auth-notice--error" role="alert">
          Request a new link to continue.
        </p>
        <p className="auth-switch">
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout
        title="Grip Restore"
        eyebrow="All set!"
        subtitle="Your password has been updated."
      >
        <h2 className="auth-card-title">Password changed</h2>
        <div className="auth-notice" role="status">
          <p>You can now log in with your new password. All other sessions were signed out.</p>
        </div>
        <p className="auth-switch">
          <Link to="/login">Log in</Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Grip Restore"
      eyebrow="New password"
      subtitle="Choose something strong that you don’t use elsewhere."
    >
      <h2 className="auth-card-title">Set a new password</h2>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          name="password"
          type="password"
          label="New password"
          error={errors.password}
          hint="At least 8 characters."
          autoComplete="new-password"
        />
        <Input
          name="confirm"
          type="password"
          label="Confirm new password"
          error={errors.confirm}
          autoComplete="new-password"
        />

        {formError && (
          <p className="auth-notice auth-notice--error" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
      <p className="auth-switch">
        <Link to="/login">Back to log in</Link>
      </p>
    </AuthLayout>
  )
}
