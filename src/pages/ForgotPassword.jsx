import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { message } = await authApi.requestPasswordReset(email.trim());
      setSent(true);
      toast.success(message);
    } catch {
      // toast por interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gradient p-4">
      <div className="w-full max-w-md card shadow-brand border-t-4 border-accent-500">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-900">Restablecer contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ingresa el correo de tu cuenta. Si está registrado, recibirás un enlace.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              Revisa tu bandeja de entrada y la carpeta de spam. El enlace caduca en poco tiempo.
            </p>
            <Link to="/login" className="btn-primary w-full inline-block text-center">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-brand-700 hover:underline">
                Volver al login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
