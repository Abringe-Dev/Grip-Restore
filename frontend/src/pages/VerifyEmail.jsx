import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../api/auth'
import AuthLayout from '../components/AuthLayout'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState(token ? 'verifying' : 'invalid')
  const [message, setMessage] = useState('')
  const startedRef = useRef(false)

  useEffect(() => {
    if (!token || startedRef.current) return
    startedRef.current = true
    verifyEmail(token)
      .then((data) => {
        setStatus('success')
        setMessage(data.message)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [token])

  return (
    <AuthLayout
      title="Grip Restore"
      eyebrow="Email verification"
      subtitle="Just checking that this link is still valid."
    >
      <h2 className="auth-card-title">
        {status === 'verifying' && 'Verifying your email…'}
        {status === 'success' && 'Email verified'}
        {status === 'error' && 'That link didn’t work'}
        {status === 'invalid' && 'Missing verification token'}
      </h2>

      {status === 'verifying' && (
        <p className="auth-notice" role="status">
          One moment…
        </p>
      )}

      {status === 'success' && (
        <div className="auth-notice" role="status">
          <p>{message}</p>
        </div>
      )}

      {(status === 'error' || status === 'invalid') && (
        <p className="auth-notice auth-notice--error" role="alert">
          {message || 'This verification link is invalid or has expired. Request a new one from the log in page.'}
        </p>
      )}

      <p className="auth-switch">
        {status === 'success' ? <Link to="/login">Log in</Link> : <Link to="/register">Create an account</Link>}
      </p>
    </AuthLayout>
  )
}
