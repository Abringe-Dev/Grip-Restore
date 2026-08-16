import Logo from '../components/Logo'

export default function AuthLayout({ title, eyebrow, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Logo size={64} showName={false} />
        <span className="auth-brand-name">Grip Restore</span>
      </div>
      <div className="auth-hero">
        <h1 className="auth-hero-title">{title}</h1>
        <p className="auth-hero-eyebrow">{eyebrow}</p>
        <p className="auth-hero-sub">{subtitle}</p>
      </div>
      <main className="auth-card">{children}</main>
    </div>
  )
}