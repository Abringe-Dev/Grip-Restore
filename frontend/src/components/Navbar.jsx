import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Logo from './Logo'
import './Navbar.css'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/start-session', label: 'Start Session' },
  { to: '/practice', label: 'Practice' },
  { to: '/history', label: 'History' },
  { to: '/account', label: 'Account' },
]

export default function Navbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/dashboard" className="navbar-brand" aria-label="Grip Restore home">
          <Logo size={36} showName={false} />
          <span className="navbar-brand-name">Grip Restore</span>
        </NavLink>

        <nav className="navbar-nav" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}