import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { IconEdit, IconKey, IconTrash } from '@tabler/icons-react';
import { Select } from 'antd';
import { catalogsApi, permissionsApi, rolesApi, usersApi } from '../api/index.js';
import { useAuth } from '../hooks/useAuth.jsx';

const emptyUser = {
  full_name: '',
  email: '',
  username: '',
  password: '',
  role_id: '',
  operational_area_ids: [],
  is_active: true,
};

const emptyRole = {
  name: '',
  description: '',
};

function Drawer({ open, title, onClose, children, width = 'max-w-xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside
        className={`absolute right-0 top-0 h-full w-full ${width} bg-white shadow-2xl border-l border-slate-200 flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </aside>
    </div>
  );
}

function MultiAreaSelect({ areas, value, onChange }) {
  const options = (areas || [])
    .filter((a) => a.is_active !== false)
    .map((a) => ({
      label: a.name,
      value: a.id,
    }));

  return (
    <Select
      mode="multiple"
      allowClear
      style={{ width: '100%' }}
      placeholder="Selecciona áreas operativas"
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManageUsers = hasPermission('users.write');
  const canReadRoles = hasPermission('roles.read', 'roles.write', 'users.write');
  const canManageRoles = hasPermission('roles.write');

  const [tab, setTab] = useState('users');
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [permissionDrawerOpen, setPermissionDrawerOpen] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [permissionRoleId, setPermissionRoleId] = useState(null);

  const [userForm, setUserForm] = useState(emptyUser);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [permissionSelection, setPermissionSelection] = useState([]);

  const [userFilters, setUserFilters] = useState({
    q: '',
    role_id: '',
    active: '',
  });
  const [roleFilter, setRoleFilter] = useState('');
  const [permissionFilter, setPermissionFilter] = useState('');

  const { data: usersPage } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    enabled: canReadRoles,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: permissionsApi.list,
    enabled: tab === 'roles' || permissionDrawerOpen,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['operational-areas'],
    queryFn: catalogsApi.areas,
  });

  const areaNameById = useMemo(() => {
    const m = new Map();
    for (const a of areas) m.set(a.id, a.name);
    return m;
  }, [areas]);

  const filteredUsers = useMemo(() => {
    const q = userFilters.q.trim().toLowerCase();
    return (usersPage?.items || []).filter((u) => {
      const matchesQ =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q);
      const matchesRole = !userFilters.role_id || String(u.role_id) === userFilters.role_id;
      const matchesActive =
        userFilters.active === ''
          ? true
          : userFilters.active === '1'
            ? u.is_active
            : !u.is_active;
      return matchesQ && matchesRole && matchesActive;
    });
  }, [usersPage, userFilters]);

  const filteredRoles = useMemo(() => {
    const q = roleFilter.trim().toLowerCase();
    return roles.filter(
      (r) => !q || r.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q),
    );
  }, [roles, roleFilter]);

  const permissionsByCategory = useMemo(() => {
    const groups = new Map();
    const q = permissionFilter.trim().toLowerCase();
    for (const p of permissions) {
      if (
        q &&
        !p.name?.toLowerCase().includes(q) &&
        !p.code?.toLowerCase().includes(q) &&
        !(p.category || '').toLowerCase().includes(q)
      ) {
        continue;
      }
      const cat = p.category || 'general';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(p);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, permissionFilter]);

  const createUser = useMutation({
    mutationFn: () =>
      usersApi.create({
        ...userForm,
        role_id: Number(userForm.role_id),
      }),
    onSuccess: () => {
      toast.success('Usuario creado');
      setUserDrawerOpen(false);
      setUserForm(emptyUser);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al crear usuario'),
  });

  const updateUser = useMutation({
    mutationFn: () =>
      usersApi.update(editingUserId, {
        full_name: userForm.full_name,
        email: userForm.email,
        username: userForm.username,
        role_id: Number(userForm.role_id),
        operational_area_ids: userForm.operational_area_ids,
        is_active: userForm.is_active,
        ...(userForm.password ? { password: userForm.password } : {}),
      }),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      setUserDrawerOpen(false);
      setEditingUserId(null);
      setUserForm(emptyUser);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al actualizar'),
  });

  const removeUser = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'No se pudo eliminar'),
  });

  const createRole = useMutation({
    mutationFn: () => rolesApi.create({ ...roleForm, permission_ids: [] }),
    onSuccess: (created) => {
      toast.success('Rol creado. Ahora asigna permisos.');
      setRoleDrawerOpen(false);
      setRoleForm(emptyRole);
      setPermissionRoleId(created.id);
      setPermissionSelection([...(created.permission_ids || [])]);
      setPermissionDrawerOpen(true);
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al crear rol'),
  });

  const updateRoleBase = useMutation({
    mutationFn: () =>
      rolesApi.update(editingRoleId, {
        name: roleForm.name,
        description: roleForm.description || null,
      }),
    onSuccess: () => {
      toast.success('Rol actualizado');
      setRoleDrawerOpen(false);
      setEditingRoleId(null);
      setRoleForm(emptyRole);
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al actualizar rol'),
  });

  const updateRolePermissions = useMutation({
    mutationFn: () => rolesApi.update(permissionRoleId, { permission_ids: permissionSelection }),
    onSuccess: () => {
      toast.success('Permisos guardados');
      setPermissionDrawerOpen(false);
      setPermissionRoleId(null);
      setPermissionSelection([]);
      setPermissionFilter('');
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al guardar permisos'),
  });

  const removeRole = useMutation({
    mutationFn: (id) => rolesApi.remove(id),
    onSuccess: () => {
      toast.success('Rol eliminado');
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'No se puede eliminar el rol'),
  });

  const openCreateUser = () => {
    setEditingUserId(null);
    setUserForm(emptyUser);
    setUserDrawerOpen(true);
  };

  const openEditUser = async (u) => {
    const detail = await usersApi.get(u.id).catch(() => u);
    setEditingUserId(u.id);
    setUserForm({
      full_name: detail.full_name || '',
      email: detail.email || '',
      username: detail.username || '',
      password: '',
      role_id: String(detail.role_id || ''),
      operational_area_ids: [...(detail.operational_area_ids || [])],
      is_active: Boolean(detail.is_active),
    });
    setUserDrawerOpen(true);
  };

  const openCreateRole = () => {
    setEditingRoleId(null);
    setRoleForm(emptyRole);
    setRoleDrawerOpen(true);
  };

  const openEditRole = (role) => {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
    });
    setRoleDrawerOpen(true);
  };

  const openPermissionEditor = (role) => {
    setPermissionRoleId(role.id);
    setPermissionSelection([...(role.permission_ids || [])]);
    setPermissionFilter('');
    setPermissionDrawerOpen(true);
  };

  const currentPermissionRole = roles.find((r) => r.id === permissionRoleId);
  const iconActionClass =
    'inline-flex items-center justify-center rounded-md p-1.5 ring-1 ring-slate-200 hover:bg-slate-50 transition';

  const clearUserFilters = () => {
    setUserFilters({ q: '', role_id: '', active: '' });
  };
  const hasActiveUserFilters =
    Boolean(userFilters.q.trim()) || Boolean(userFilters.role_id) || Boolean(userFilters.active);

  const clearRoleFilter = () => setRoleFilter('');
  const hasActiveRoleFilter = Boolean(roleFilter.trim());

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Usuarios y roles</h2>
        <p className="text-sm text-slate-500">
          Tablas con filtros, formularios en drawer y flujo de roles en dos pasos.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'users'
              ? 'bg-brand-700 text-white shadow'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
          onClick={() => setTab('users')}
        >
          Usuarios
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'roles'
              ? 'bg-brand-700 text-white shadow'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
          onClick={() => setTab('roles')}
        >
          Roles
        </button>
      </div>

      {tab === 'users' && (
        <>
          <section className="card space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Filtros del listado</h3>
                <p className="text-sm text-slate-500">
                  Nombre, correo, usuario de acceso, rol y estado.
                </p>
              </div>
              {hasActiveUserFilters && (
                <button
                  type="button"
                  className="text-sm text-brand-700 hover:underline self-start"
                  onClick={clearUserFilters}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="label">Buscar</label>
                <input
                  className="input"
                  placeholder="Nombre, email o usuario"
                  value={userFilters.q}
                  onChange={(e) => setUserFilters((f) => ({ ...f, q: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Rol</label>
                <select
                  className="input"
                  value={userFilters.role_id}
                  onChange={(e) => setUserFilters((f) => ({ ...f, role_id: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Estado</label>
                <select
                  className="input"
                  value={userFilters.active}
                  onChange={(e) => setUserFilters((f) => ({ ...f, active: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="1">Activos</option>
                  <option value="0">Inactivos</option>
                </select>
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-slate-800">Usuarios</h3>
              <button
                type="button"
                className="btn-primary shrink-0 self-start"
                disabled={!canManageUsers}
                onClick={openCreateUser}
              >
                Agregar usuario
              </button>
            </div>

            <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600 border-b">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Áreas</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2">{u.full_name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.username}</td>
                    <td className="px-3 py-2">{u.role_name || u.role_id}</td>
                    <td className="px-3 py-2 max-w-[260px] truncate">
                      {(u.operational_area_ids || [])
                        .map((id) => areaNameById.get(id) || `#${id}`)
                        .join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2">{u.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        type="button"
                        title="Editar usuario"
                        aria-label="Editar usuario"
                        className={`${iconActionClass} text-brand-700`}
                        disabled={!canManageUsers}
                        onClick={() => openEditUser(u)}
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        type="button"
                        title="Eliminar usuario"
                        aria-label="Eliminar usuario"
                        className={`${iconActionClass} text-red-600`}
                        disabled={!canManageUsers}
                        onClick={() => removeUser.mutate(u.id)}
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                      Sin resultados para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </section>
        </>
      )}

      {tab === 'roles' && (
        <>
          <section className="card space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Filtros del listado</h3>
                <p className="text-sm text-slate-500">Nombre o descripción del rol.</p>
              </div>
              {hasActiveRoleFilter && (
                <button
                  type="button"
                  className="text-sm text-brand-700 hover:underline self-start"
                  onClick={clearRoleFilter}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="label">Buscar</label>
                <input
                  className="input"
                  placeholder="Nombre o descripción del rol"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-slate-800">Roles</h3>
              {canManageRoles && (
                <button
                  type="button"
                  className="btn-primary shrink-0 self-start"
                  onClick={openCreateRole}
                >
                  Agregar rol
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600 border-b">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Permisos</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRoles.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-slate-600">{r.description || '—'}</td>
                    <td className="px-3 py-2">{r.permission_ids?.length || 0}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      {canManageRoles && (
                        <>
                          <button
                            type="button"
                            title="Editar rol"
                            aria-label="Editar rol"
                            className={`${iconActionClass} text-brand-700`}
                            onClick={() => openEditRole(r)}
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            type="button"
                            title="Asignar permisos"
                            aria-label="Asignar permisos"
                            className={`${iconActionClass} text-indigo-700`}
                            onClick={() => openPermissionEditor(r)}
                          >
                            <IconKey size={16} />
                          </button>
                          <button
                            type="button"
                            title="Eliminar rol"
                            aria-label="Eliminar rol"
                            className={`${iconActionClass} text-red-600`}
                            onClick={() => removeRole.mutate(r.id)}
                          >
                            <IconTrash size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRoles.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                      Sin resultados para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </section>
        </>
      )}

      <Drawer
        open={userDrawerOpen}
        title={editingUserId ? 'Editar usuario' : 'Agregar usuario'}
        onClose={() => {
          setUserDrawerOpen(false);
          setEditingUserId(null);
          setUserForm(emptyUser);
        }}
      >
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Nombre completo"
            value={userForm.full_name}
            onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={userForm.email}
            onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Usuario"
            value={userForm.username}
            onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
          />
          <input
            className="input"
            type="password"
            placeholder={editingUserId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={userForm.password}
            onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
          />
          <select
            className="input"
            value={userForm.role_id}
            onChange={(e) => setUserForm((f) => ({ ...f, role_id: e.target.value }))}
          >
            <option value="">Selecciona rol</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <div>
            <label className="label">Áreas operativas (multiselección)</label>
            <MultiAreaSelect
              areas={areas}
              value={userForm.operational_area_ids}
              onChange={(ids) => setUserForm((f) => ({ ...f, operational_area_ids: ids }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={userForm.is_active}
              onChange={(e) => setUserForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Usuario activo
          </label>
        </div>
        <div className="pt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setUserDrawerOpen(false);
              setEditingUserId(null);
              setUserForm(emptyUser);
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={
              (editingUserId ? updateUser.isPending : createUser.isPending) ||
              !userForm.full_name.trim() ||
              !userForm.email.trim() ||
              !userForm.username.trim() ||
              !userForm.role_id ||
              (!editingUserId && !userForm.password)
            }
            onClick={() => (editingUserId ? updateUser.mutate() : createUser.mutate())}
          >
            {editingUserId ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </Drawer>

      <Drawer
        open={roleDrawerOpen}
        title={editingRoleId ? 'Editar rol' : 'Agregar rol'}
        onClose={() => {
          setRoleDrawerOpen(false);
          setEditingRoleId(null);
          setRoleForm(emptyRole);
        }}
        width="max-w-lg"
      >
        <p className="text-xs text-slate-500 mb-3">
          Paso 1: define los datos del rol. Paso 2: asigna permisos desde el botón Permisos.
        </p>
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Nombre del rol"
            value={roleForm.name}
            onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Descripción"
            value={roleForm.description}
            onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="pt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setRoleDrawerOpen(false);
              setEditingRoleId(null);
              setRoleForm(emptyRole);
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={
              (editingRoleId ? updateRoleBase.isPending : createRole.isPending) ||
              !roleForm.name.trim()
            }
            onClick={() => (editingRoleId ? updateRoleBase.mutate() : createRole.mutate())}
          >
            {editingRoleId ? 'Guardar rol' : 'Crear rol'}
          </button>
        </div>
      </Drawer>

      <Drawer
        open={permissionDrawerOpen}
        title={`Permisos del rol: ${currentPermissionRole?.name || ''}`}
        onClose={() => {
          setPermissionDrawerOpen(false);
          setPermissionRoleId(null);
          setPermissionSelection([]);
          setPermissionFilter('');
        }}
      >
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Filtrar permisos por nombre, código o categoría"
            value={permissionFilter}
            onChange={(e) => setPermissionFilter(e.target.value)}
          />
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-[65vh] overflow-y-auto space-y-4">
            {permissionsByCategory.map(([cat, list]) => (
              <div key={cat}>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{cat}</p>
                <div className="space-y-2">
                  {list.map((p) => (
                    <label key={p.id} className="flex gap-2 items-start text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissionSelection.includes(p.id)}
                        onChange={() =>
                          setPermissionSelection((prev) =>
                            prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                          )
                        }
                      />
                      <span>
                        <span className="font-medium text-slate-800">{p.name}</span>
                        <span className="block text-[11px] text-slate-500">{p.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {permissionsByCategory.length === 0 && (
              <p className="text-sm text-slate-500">Sin permisos para el filtro actual.</p>
            )}
          </div>
        </div>
        <div className="pt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setPermissionDrawerOpen(false);
              setPermissionRoleId(null);
              setPermissionSelection([]);
              setPermissionFilter('');
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={updateRolePermissions.isPending || !permissionRoleId}
            onClick={() => updateRolePermissions.mutate()}
          >
            Guardar permisos
          </button>
        </div>
      </Drawer>
    </div>
  );
}
