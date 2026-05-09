import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  IconBook2,
  IconChartBar,
  IconChecklist,
  IconGift,
  IconMap2,
  IconNotebook,
  IconSettings,
  IconTool,
  IconUsers,
  IconUserShield,
  IconLogout2,
} from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: IconChartBar },
  { to: '/citizens', label: 'Ciudadanos', icon: IconUsers, permissions: ['citizens.read'] },
  { to: '/services', label: 'Servicios', icon: IconTool, permissions: ['services.read'] },
  { to: '/supports', label: 'Apoyos', icon: IconGift, permissions: ['supports.read'] },
  { to: '/map', label: 'Mapa', icon: IconMap2, permissions: ['map.view'] },
  { to: '/surveys', label: 'Encuestas', icon: IconNotebook, permissions: ['surveys.read'] },
  { to: '/catalogs', label: 'Catálogos', icon: IconBook2, permissions: ['catalogs.read'] },
  { to: '/logs', label: 'Bitácora', icon: IconChecklist, permissions: ['roles.read'] },
  { to: '/users', label: 'Usuarios', icon: IconUserShield, permissions: ['users.read'] },
];

export default function MainLayout() {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-cream-50">
      <aside className="w-64 shrink-0 bg-brand-900 text-cream-50 flex flex-col">
        <div className="px-6 py-5 border-b border-brand-800 bg-brand-950">
          <h1 className="text-lg font-semibold text-white">Plataforma</h1>
          <p className="text-xs text-accent-300">Gestión Ciudadana</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((i) => {
              if (i.permissions?.length && !hasPermission(...i.permissions)) return false;
              if (i.roles?.length && !hasRole(...i.roles)) return false;
              return true;
            })
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition border-l-2 ${
                    isActive
                      ? 'bg-brand-700 text-white border-accent-500'
                      : 'border-transparent text-cream-100/80 hover:bg-brand-800 hover:text-white hover:border-accent-400/60'
                  }`
                }
              >
                <item.icon size={18} stroke={1.9} aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="px-6 py-3 max-w-7xl mx-auto flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.full_name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <button
              type="button"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-red-600 transition"
            >
              <IconLogout2 size={18} stroke={1.75} aria-hidden />
            </button>
          </div>
        </header>
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
