import './Button.css'

export default function Button({ children, type = 'button', variant = 'primary', fullWidth = true, color, onClick, ...rest }) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}${fullWidth ? ' btn--full' : ''}`}
      style={color ? { '--btn-bg': color } : undefined}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}