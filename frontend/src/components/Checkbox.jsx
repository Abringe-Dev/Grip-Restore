import './Checkbox.css'

export default function Checkbox({ label, name, checked, onChange }) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        className="checkbox-input"
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className="checkbox-box" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-6" stroke="#F4F8F8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="checkbox-label">{label}</span>
    </label>
  )
}