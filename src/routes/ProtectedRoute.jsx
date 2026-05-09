import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ProtectedRoute({ children, roles, permissions }) {
  const { token, hasRole, hasPermission } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles?.length && !hasRole(...roles)) return <Navigate to="/dashboard" replace />;
  if (permissions?.length && !hasPermission(...permissions))
    return <Navigate to="/dashboard" replace />;
  return children;
}
