import logoImg from '../assets/logo.png'
import './Logo.css'

export default function Logo({ size = 64, showName = true }) {
  return (
    <div className="logo">
      <img className="logo-img" src={logoImg} alt="Grip Restore logo" width={size} height={size} />
      {showName && <span className="logo-name">Grip Restore</span>}
    </div>
  )
}