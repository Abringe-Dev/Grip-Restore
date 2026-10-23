import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { resendVerification } from '../api/auth'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import Input from '../components/Input'
import Checkbox from '../components/Checkbox'

const emailIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 7l8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const passwordIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)
  const [notice, setNotice] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')

    const next = {}
    if (!email) next.email = 'Please enter your email.'
    else if (!EMAIL_PATTERN.test(email)) next.email = 'That email doesn’t look right — try again.'
    if (!password) next.password = 'Please enter your password.'

    setErrors(next)
    setFormError('')
    setNeedsVerify(false)
    setNotice(null)
    if (Object.keys(next).length > 0) return

    setPendingEmail(email)
    setBusy(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setFormError(err.message)
      if (err.code === 'EMAIL_NOT_VERIFIED') setNeedsVerify(true)
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (!pendingEmail) return
    setBusy(true)
    setNotice(null)
    try {
      const data = await resendVerification(pendingEmail)
      setNotice(data)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Grip Restore"
      eyebrow="Welcome back!"
      subtitle="Sign in to continue your rehabilitation journey."
    >
      <h2 className="auth-card-title">Log in to your account</h2>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          name="email"
          type="email"
          label="Email"
          icon={emailIcon}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          name="password"
          type="password"
          label="Password"
          icon={passwordIcon}
          error={errors.password}
          autoComplete="current-password"
        />
        <div className="auth-row">
          <Checkbox
            name="remember"
            label="Remember me"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link className="auth-link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        {formError && (
          <p className="auth-notice auth-notice--error" role="alert">
            {formError}
          </p>
        )}

        {notice && (
          <div className="auth-notice" role="status">
            <p>{notice.message}</p>
            {notice.devVerifyUrl && (
              <p>
                <a className="auth-link" href={notice.devVerifyUrl}>
                  Open verification link (dev)
                </a>
              </p>
            )}
          </div>
        )}

        {needsVerify && (
          <div className="auth-actions">
            <Button type="button" variant="ghost" fullWidth={false} onClick={handleResend} disabled={busy}>
              Resend verification email
            </Button>
          </div>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="auth-switch">
        Don&rsquo;t have an account? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
