import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  IconBook2,
  IconChartBar,
  IconChecklist,
  IconGift,
  IconMap2,
  IconMenu2,
  IconNotebook,
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

function filterNavItems(items, hasPermission, hasRole) {
  return items.filter((i) => {
    if (i.permissions?.length && !hasPermission(...i.permissions)) return false;
    if (i.roles?.length && !hasRole(...i.roles)) return false;
    return true;
  });
}

function NavLinks({ items, onNavigate }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition border-l-2 touch-manipulation ${
              isActive
                ? 'bg-brand-700 text-white border-accent-500'
                : 'border-transparent text-cream-100/80 hover:bg-brand-800 hover:text-white hover:border-accent-400/60 active:bg-brand-800'
            }`
          }
        >
          <item.icon size={18} stroke={1.9} aria-hidden />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  );
}

function SidebarBrand() {
  return (
    <div className="px-6 py-5 border-b border-brand-800 bg-brand-950">
      <h1 className="text-lg font-semibold text-white">Plataforma</h1>
      <p className="text-xs text-accent-300">Gestión Ciudadana</p>
    </div>
  );
}

export default function MainLayout() {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleNav = filterNavItems(navItems, hasPermission, hasRole);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-cream-50">
      {/* Sidebar escritorio */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-brand-900 text-cream-50 flex-col">
        <SidebarBrand />
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks items={visibleNav} />
        </nav>
      </aside>

      {/* Menú móvil: overlay + panel (sin Ant Design) */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <aside
            className="absolute left-0 top-0 h-full w-[min(100vw,18rem)] max-w-[85vw] bg-brand-900 text-cream-50 flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <SidebarBrand />
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
              <NavLinks
                items={visibleNav}
                onNavigate={closeMenu}
              />
            </nav>
          </aside>
        </div>
      ) : null}

      <main className="flex-1 min-w-0 flex flex-col overflow-auto">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="px-4 sm:px-6 py-3 max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 touch-manipulation"
                aria-label="Abrir menú"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                <IconMenu2 size={20} stroke={1.75} aria-hidden />
              </button>
              <div className="lg:hidden min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {visibleNav.find((i) => location.pathname.startsWith(i.to))?.label || 'Plataforma'}
                </p>
                <p className="text-xs text-slate-500 truncate">Gestión Ciudadana</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800 max-w-[10rem] sm:max-w-none truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
              <button
                type="button"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-red-600 transition touch-manipulation"
              >
                <IconLogout2 size={18} stroke={1.75} aria-hidden />
              </button>
            </div>
          </div>
        </header>
        <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
