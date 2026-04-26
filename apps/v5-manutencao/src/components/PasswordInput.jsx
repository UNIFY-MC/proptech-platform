import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({
  value, onChange, placeholder, autoComplete, name, id, required, style
}) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        name={name}
        required={required}
        style={{ ...style, paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Esconder password' : 'Mostrar password'}
        style={{
          position: 'absolute', right: 10, top: 0, bottom: 0, margin: 'auto',
          height: 24, background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 2px', display: 'flex', alignItems: 'center', color: '#aaa',
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
