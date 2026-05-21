import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.js';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { message } = await authApi.confirmPasswordReset(token, password);
      toast.success(message);
      navigate('/login', { replace: true });
    } catch {
      // toast por interceptor
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gradient p-4">
        <div className="w-full max-w-md card shadow-brand border-t-4 border-accent-500 text-center space-y-4">
          <p className="text-sm text-slate-600">El enlace no es válido o falta el token.</p>
          <Link to="/forgot-password" className="btn-primary inline-block">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gradient p-4">
      <div className="w-full max-w-md card shadow-brand border-t-4 border-accent-500">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-900">Nueva contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">Elige una contraseña segura para tu cuenta.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordInput
            id="new-password"
            label="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordInput
            id="confirm-password"
            label="Confirmar contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-brand-700 hover:underline">
              Volver al login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
