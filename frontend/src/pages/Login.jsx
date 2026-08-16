import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
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

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})

  function handleSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')

    const next = {}
    if (!email) next.email = 'Please enter your email.'
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'That email doesn\u2019t look right \u2014 try again.'
    if (!password) next.password = 'Please enter your password.'

    setErrors(next)
    if (Object.keys(next).length === 0) {
      login()
      navigate('/dashboard')
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
        <Button type="submit">Log in</Button>
      </form>
      <p className="auth-switch">
        Don&rsquo;t have an account? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}