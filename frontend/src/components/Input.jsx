import { useState } from 'react'
import './Input.css'

export default function Input({
  label,
  icon,
  type = 'text',
  error,
  hint,
  name,
  autoComplete,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className="field">
      <div className={`field-input-wrap${error ? ' field-input-wrap--error' : ''}`}>
        {icon && <span className="field-icon" aria-hidden="true">{icon}</span>}
        <input
          id={name}
          name={name}
          className="field-input"
          type={inputType}
          placeholder=" "
          aria-invalid={error ? 'true' : 'false'}
          autoComplete={autoComplete}
          {...rest}
        />
        <label className="field-label" htmlFor={name}>{label}</label>
        {isPassword && (
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? eyeIcon('off') : eyeIcon('on')}
          </button>
        )}
      </div>
      {error ? (
        <p className="field-msg field-msg--error" role="alert">{error}</p>
      ) : hint ? (
        <p className="field-msg">{hint}</p>
      ) : null}
    </div>
  )
}

function eyeIcon(mode) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      {mode === 'off' && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  )
}