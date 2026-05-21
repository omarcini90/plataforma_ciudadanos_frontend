import { useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

export default function PasswordInput({
  label = 'Contraseña',
  value,
  onChange,
  required = true,
  autoComplete = 'current-password',
  id = 'password',
  placeholder,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="input pr-10"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-500 hover:text-brand-700"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? (
            <IconEyeOff size={18} stroke={1.75} aria-hidden />
          ) : (
            <IconEye size={18} stroke={1.75} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
