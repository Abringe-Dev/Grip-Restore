import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { upsertProfile } from '../data/userStore'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import Input from '../components/Input'
import Checkbox from '../components/Checkbox'

const nameIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

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

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})

  function handleSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    const confirm = String(data.get('confirm') || '')

    const next = {}
    if (!name) next.name = 'We\u2019d love to know what to call you.'
    if (!email) next.email = 'Please enter your email.'
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'That email doesn\u2019t look right \u2014 try again.'
    if (!password) next.password = 'Please choose a password.'
    else if (password.length < 8) next.password = 'Use at least 8 characters for safety.'
    if (!confirm) next.confirm = 'Please confirm your password.'
    else if (confirm !== password) next.confirm = 'Those passwords don\u2019t match.'

    setErrors(next)
    if (Object.keys(next).length === 0) {
      upsertProfile(email, name)
      login(email, name)
      navigate('/dashboard')
    }
  }

  return (
    <AuthLayout
      title="Grip Restore"
      eyebrow="Greetings!"
      subtitle="Sign up to start your rehabilitation journey."
    >
      <h2 className="auth-card-title">Create your account</h2>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          name="name"
          type="text"
          label="What should we call you?"
          icon={nameIcon}
          error={errors.name}
          autoComplete="name"
        />
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
          hint="At least 8 characters."
          autoComplete="new-password"
        />
        <Input
          name="confirm"
          type="password"
          label="Confirm Password"
          icon={passwordIcon}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <Checkbox
          name="remember"
          label="Remember me"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <Button type="submit">Create Account</Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}