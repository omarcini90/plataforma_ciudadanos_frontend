import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      toast.success('Bienvenido');
      navigate('/dashboard');
    } catch {
      // toast manejado por interceptor
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gradient p-4">
      <div className="w-full max-w-md card shadow-brand border-t-4 border-accent-500">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 ring-1 ring-brand-100 mb-3">
            <span className="text-2xl">🏛️</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-900">Plataforma Ciudadanos</h1>
          <p className="text-sm text-slate-500 mt-1">Inicia sesión para continuar</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Usuario o correo
            </label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-brand-700 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
