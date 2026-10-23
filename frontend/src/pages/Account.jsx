import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import { useAuth } from '../context/useAuth'
import { changePassword } from '../api/auth'
import './../styles/account.css'

export default function Account() {
  const { user, logoutAll } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef(null)

  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handlePasswordChange(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const currentPassword = String(data.get('currentPassword') || '')
    const newPassword = String(data.get('newPassword') || '')
    const confirm = String(data.get('confirm') || '')

    const next = {}
    if (!currentPassword) next.currentPassword = 'Please enter your current password.'
    if (!newPassword) next.newPassword = 'Please choose a new password.'
    else if (newPassword.length < 8) next.newPassword = 'Use at least 8 characters for safety.'
    else if (newPassword.length > 128) next.newPassword = 'Use 128 characters or fewer.'
    else if (newPassword === currentPassword) next.newPassword = 'Choose a password different from your current one.'
    if (!confirm) next.confirm = 'Please confirm your new password.'
    else if (confirm !== newPassword) next.confirm = 'Those passwords don’t match.'

    setErrors(next)
    setFormError('')
    setNotice('')
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      setNotice(result.message)
      setErrors({})
      if (formRef.current) formRef.current.reset()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLogoutAll() {
    setSigningOut(true)
    setFormError('')
    try {
      await logoutAll()
    } catch {
      /* local session is cleared regardless */
    } finally {
      navigate('/login')
    }
  }

  return (
    <main className="account-main">
      <section className="account-hero">
        <h1 className="account-title">Your account</h1>
        <p className="account-sub">Keep your sign-in details safe and up to date.</p>
      </section>

      <div className="account-grid">
        <section className="account-card" aria-labelledby="account-profile-title">
          <h2 id="account-profile-title" className="account-card-title">Profile</h2>
          <dl className="account-profile">
            <div className="account-profile-row">
              <dt>Name</dt>
              <dd>{user?.name || '—'}</dd>
            </div>
            <div className="account-profile-row">
              <dt>Email</dt>
              <dd>{user?.email || '—'}</dd>
            </div>
            <div className="account-profile-row">
              <dt>Status</dt>
              <dd>
                <span className="account-badge">
                  {user?.emailVerified ? 'Verified' : 'Unverified'}
                </span>
              </dd>
            </div>
          </dl>
          <p className="account-note">
            Your progress is stored on this account and is available on any device you sign in to.
          </p>
        </section>

        <section className="account-card" aria-labelledby="account-password-title">
          <h2 id="account-password-title" className="account-card-title">Change password</h2>
          <form ref={formRef} className="account-form" onSubmit={handlePasswordChange} noValidate>
            <Input
              name="currentPassword"
              type="password"
              label="Current password"
              error={errors.currentPassword}
              autoComplete="current-password"
            />
            <Input
              name="newPassword"
              type="password"
              label="New password"
              error={errors.newPassword}
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
              <p className="account-notice account-notice--error" role="alert">
                {formError}
              </p>
            )}
            {notice && (
              <p className="account-notice" role="status">
                {notice}
              </p>
            )}

            <Button type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </Button>
          </form>
          <p className="account-note">Changing your password signs out every other device.</p>
        </section>

        <section className="account-card" aria-labelledby="account-sessions-title">
          <h2 id="account-sessions-title" className="account-card-title">Devices</h2>
          <p className="account-note">
            Signing out everywhere ends this session too, so you&rsquo;ll need to log in again.
          </p>
          <Button variant="ghost" fullWidth={false} onClick={handleLogoutAll} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out of all devices'}
          </Button>
        </section>
      </div>
    </main>
  )
}
