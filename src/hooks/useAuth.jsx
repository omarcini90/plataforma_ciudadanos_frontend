import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

function normalizeUser(raw) {
  if (!raw) return null;
  return {
    ...raw,
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    operational_area_ids: Array.isArray(raw.operational_area_ids) ? raw.operational_area_ids : [],
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      authApi.me().then((u) => {
        const mapped = normalizeUser(u);
        setUser(mapped);
        localStorage.setItem('user', JSON.stringify(mapped));
      }).catch(() => {});
    }
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(normalizeUser(data.user)));
      setToken(data.access_token);
      setUser(normalizeUser(data.user));
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles) =>
    !!user && roles.map((r) => r.toUpperCase()).includes((user.role || '').toUpperCase());

  /** Si pasas varios códigos, basta con tener uno (OR). */
  const hasPermission = (...codes) => {
    if (!user?.permissions?.length || !codes.length) return false;
    const set = new Set(user.permissions);
    return codes.some((c) => set.has(c));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, hasRole, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
