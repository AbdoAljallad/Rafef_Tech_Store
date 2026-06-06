import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../modules/admin/api/admin.api';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import { isApiError } from '../../shared/api/apiErrors';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Modal } from '../../shared/components/Modal/Modal';
import { usePermission } from '../../shared/permissions/usePermission';
import { Button } from '../../shared/ui/Button';
import { Checkbox } from '../../shared/ui/Checkbox';
import { IconButton } from '../../shared/ui/IconButton';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';

type UserStatus = 'active' | 'disabled' | 'locked';

type UserForm = {
  username: string;
  password: string;
  displayName: string;
  roleId: string;
  status: UserStatus;
  maxDiscountPercent: string;
  resetPermissionsToRole: boolean;
};

const emptyForm: UserForm = {
  username: '',
  password: '',
  displayName: '',
  roleId: '',
  status: 'active',
  maxDiscountPercent: '',
  resetPermissionsToRole: false,
};

function toForm(user: any): UserForm {
  return {
    username: user.username ?? '',
    password: '',
    displayName: user.display_name ?? '',
    roleId: String(user.role_id ?? ''),
    status: user.status ?? 'active',
    maxDiscountPercent: user.max_discount_percent === null || user.max_discount_percent === undefined ? '' : String(user.max_discount_percent),
    resetPermissionsToRole: false,
  };
}

function toDiscount(value: string) {
  return value === '' ? null : Number(value);
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canManageUsers = usePermission('auth.users.manage');
  const canManagePermissions = usePermission('auth.permissions.manage');
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const [permissionUser, setPermissionUser] = useState<any | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set());
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [users, roles, permissions] = useQueries({
    queries: [
      { queryKey: ['adminUsers'], queryFn: adminApi.users },
      { queryKey: ['adminRoles'], queryFn: adminApi.roles },
      { queryKey: ['adminPermissions'], queryFn: adminApi.permissions },
    ],
  });
  const settings = useQuery({ queryKey: ['adminSettings'], queryFn: adminApi.settings });

  const permissionsByModule = useMemo(() => {
    const grouped = new Map<string, any[]>();
    for (const permission of permissions.data?.items ?? []) {
      const items = grouped.get(permission.module) ?? [];
      items.push(permission);
      grouped.set(permission.module, items);
    }
    return Array.from(grouped.entries());
  }, [permissions.data?.items]);

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] });

  const createUser = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: async () => {
      await invalidateUsers();
      closeUserModal();
    },
    onError: (error) => setFormError(userErrorMessage(error)),
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: Parameters<typeof adminApi.updateUser>[1] }) =>
      adminApi.updateUser(userId, payload),
    onSuccess: async () => {
      await invalidateUsers();
      closeUserModal();
    },
    onError: (error) => setFormError(userErrorMessage(error)),
  });

  const removeUser = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: async () => {
      await invalidateUsers();
      setDeleteUser(null);
    },
  });

  const savePermissions = useMutation({
    mutationFn: ({ userId, permissionIds }: { userId: number; permissionIds: number[] }) =>
      adminApi.updateUserPermissions(userId, { permissionIds }),
    onSuccess: async () => {
      await invalidateUsers();
      setPermissionUser(null);
      setSelectedPermissionIds(new Set());
      setPermissionError(null);
    },
    onError: () => setPermissionError('Could not update permissions.'),
  });

  const resetPermissions = useMutation({
    mutationFn: adminApi.resetUserPermissions,
    onSuccess: async (response) => {
      await invalidateUsers();
      setSelectedPermissionIds(new Set(response.user.permissionIds ?? []));
      setPermissionError(null);
    },
    onError: () => setPermissionError('Could not reset permissions.'),
  });

  function userErrorMessage(error: unknown) {
    if (isApiError(error)) {
      if (error.code === 'USERNAME_ALREADY_EXISTS') return 'Username already exists.';
      if (error.code === 'CANNOT_DISABLE_SELF') return 'You cannot disable or lock your own account.';
      if (error.code === 'ROLE_NOT_FOUND') return 'Selected role is not available.';
    }

    return 'Could not save user. Check the fields and try again.';
  }

  function updateField<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setMode('create');
    setSelectedUser(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function openEdit(user: any) {
    setMode('edit');
    setSelectedUser(user);
    setForm(toForm(user));
    setFormError(null);
  }

  async function openPermissions(user: any) {
    setPermissionError(null);
    const response = await adminApi.user(user.id);
    setPermissionUser(response.user);
    setSelectedPermissionIds(new Set(response.user.permissionIds ?? []));
  }

  function closeUserModal() {
    if (createUser.isPending || updateUser.isPending) return;
    setMode(null);
    setSelectedUser(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.username.trim() || !form.displayName.trim() || !form.roleId) {
      setFormError('Username, name, and role are required.');
      return;
    }

    if (mode === 'create' && form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    if (mode === 'edit' && form.password && form.password.length < 8) {
      setFormError('New password must be at least 8 characters.');
      return;
    }

    const payload = {
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      roleId: Number(form.roleId),
      status: form.status,
      maxDiscountPercent: toDiscount(form.maxDiscountPercent),
    };

    if (mode === 'create') {
      createUser.mutate({ ...payload, password: form.password });
      return;
    }

    if (selectedUser) {
      updateUser.mutate({
        userId: selectedUser.id,
        payload: {
          ...payload,
          password: form.password || undefined,
          resetPermissionsToRole: form.resetPermissionsToRole,
        },
      });
    }
  }

  function togglePermission(permissionId: number) {
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  }

  function submitPermissions() {
    if (!permissionUser) return;
    savePermissions.mutate({
      userId: permissionUser.id,
      permissionIds: Array.from(selectedPermissionIds),
    });
  }

  const userModalTitle = mode === 'create' ? 'Add user' : 'Edit user';

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Administration</h1>
        </div>
        {canManageUsers ? (
          <Button type="button" icon={<Plus size={18} />} onClick={openCreate}>
            Add user
          </Button>
        ) : null}
      </header>

      <section className="page-toolbar">
        <Link to="/finance/accounts">Payment accounts</Link>
        <Link to="/finance/payment-methods">Payment methods</Link>
      </section>

      <section className="panel entity-summary">
        <h2>Main settings</h2>
        <p><strong>Application:</strong> {settings.data?.settings.appName ?? 'Rafef Tech'}</p>
        <p><strong>Authorization:</strong> {settings.data?.settings.authMode ?? '-'}</p>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Users</h2>
          <DataTable rows={users.data?.items ?? []} isLoading={users.isLoading} emptyText="No users found" getRowKey={(u) => u.id} columns={[
            { key: 'username', header: 'Username', render: (u) => u.username },
            { key: 'name', header: 'Name', render: (u) => u.display_name },
            { key: 'role', header: 'Role', render: (u) => u.role_code },
            { key: 'status', header: 'Status', render: (u) => u.status },
            {
              key: 'actions',
              header: '',
              render: (u) => (
                <div className="row-actions">
                  {canManageUsers ? <IconButton label="Edit user" icon={<Edit2 size={16} />} onClick={() => openEdit(u)} /> : null}
                  {canManagePermissions ? <IconButton label="Permissions" icon={<ShieldCheck size={16} />} onClick={() => void openPermissions(u)} /> : null}
                  {canManageUsers && currentUser?.id !== u.id ? (
                    <IconButton label="Delete user" icon={<Trash2 size={16} />} onClick={() => setDeleteUser(u)} />
                  ) : null}
                </div>
              ),
            },
          ]} />
        </article>

        <article className="panel">
          <h2>Roles</h2>
          <DataTable rows={roles.data?.items ?? []} isLoading={roles.isLoading} emptyText="No roles found" getRowKey={(r) => r.id} columns={[
            { key: 'code', header: 'Code', render: (r) => r.code },
            { key: 'name', header: 'Name', render: (r) => r.name_ru },
            { key: 'status', header: 'Status', render: (r) => (r.is_active ? 'active' : 'disabled') },
          ]} />
        </article>
      </section>

      <section className="panel">
        <h2>Permissions</h2>
        <DataTable rows={permissions.data?.items ?? []} isLoading={permissions.isLoading} emptyText="No permissions found" getRowKey={(p) => p.id} columns={[
          { key: 'module', header: 'Module', render: (p) => p.module },
          { key: 'code', header: 'Code', render: (p) => p.code },
          { key: 'name', header: 'Name', render: (p) => p.name_ru },
        ]} />
      </section>

      <Modal title={userModalTitle} isOpen={mode !== null} onClose={closeUserModal}>
        <form className="form-stack" onSubmit={submitUser}>
          <Input label="Username" name="username" value={form.username} onChange={(event) => updateField('username', event.target.value)} autoComplete="off" />
          <Input label="Display name" name="displayName" value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} autoComplete="off" />
          <Input
            label={mode === 'create' ? 'Password' : 'New password'}
            name="password"
            type="password"
            value={form.password}
            placeholder={mode === 'edit' ? 'Leave empty to keep current password' : undefined}
            onChange={(event) => updateField('password', event.target.value)}
            autoComplete="new-password"
          />
          <Select label="Role" name="roleId" value={form.roleId} onChange={(event) => updateField('roleId', event.target.value)}>
            <option value="">Select role</option>
            {(roles.data?.items ?? [])
              .filter((role) => role.is_active)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.code}
                </option>
              ))}
          </Select>
          <Select label="Status" name="status" value={form.status} onChange={(event) => updateField('status', event.target.value as UserStatus)}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="locked">Locked</option>
          </Select>
          <Input label="Max discount percent" name="maxDiscountPercent" type="number" min="0" max="100" step="0.01" value={form.maxDiscountPercent} onChange={(event) => updateField('maxDiscountPercent', event.target.value)} />
          {mode === 'edit' ? (
            <Checkbox
              label="Reset permissions to role defaults"
              checked={form.resetPermissionsToRole}
              onChange={(event) => updateField('resetPermissionsToRole', event.target.checked)}
            />
          ) : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="form-actions">
            <Button type="button" variant="secondary" disabled={createUser.isPending || updateUser.isPending} onClick={closeUserModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createUser.isPending || updateUser.isPending}>
              Save user
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title="User permissions" isOpen={Boolean(permissionUser)} onClose={() => setPermissionUser(null)}>
        <div className="form-stack">
          <p><strong>{permissionUser?.username}</strong></p>
          <div className="permission-groups">
            {permissionsByModule.map(([module, modulePermissions]) => (
              <section className="permission-group" key={module}>
                <h3>{module}</h3>
                {modulePermissions.map((permission) => (
                  <Checkbox
                    key={permission.id}
                    label={permission.code}
                    checked={selectedPermissionIds.has(permission.id)}
                    onChange={() => togglePermission(permission.id)}
                  />
                ))}
              </section>
            ))}
          </div>
          {permissionError ? <p className="form-error">{permissionError}</p> : null}
          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              icon={<RotateCcw size={16} />}
              disabled={!permissionUser || resetPermissions.isPending || savePermissions.isPending}
              onClick={() => permissionUser && resetPermissions.mutate(permissionUser.id)}
            >
              Role defaults
            </Button>
            <Button type="button" variant="secondary" disabled={savePermissions.isPending} onClick={() => setPermissionUser(null)}>
              Cancel
            </Button>
            <Button type="button" isLoading={savePermissions.isPending} onClick={submitPermissions}>
              Save permissions
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        title="Delete user"
        message={`Delete ${deleteUser?.username ?? 'this user'}? The account will be disabled and active sessions will be revoked.`}
        isOpen={Boolean(deleteUser)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && removeUser.mutate(deleteUser.id)}
      />
    </>
  );
}
