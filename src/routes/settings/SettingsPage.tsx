import { FormEvent, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../modules/admin/api/admin.api';
import { isApiError } from '../../shared/api/apiErrors';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { Modal } from '../../shared/components/Modal/Modal';
import { usePermission } from '../../shared/permissions/usePermission';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';

type CreateUserForm = {
  username: string;
  password: string;
  displayName: string;
  roleId: string;
  status: 'active' | 'disabled' | 'locked';
  maxDiscountPercent: string;
};

const initialForm: CreateUserForm = {
  username: '',
  password: '',
  displayName: '',
  roleId: '',
  status: 'active',
  maxDiscountPercent: '',
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const canManageUsers = usePermission('auth.users.manage');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [users, roles, permissions] = useQueries({
    queries: [
      { queryKey: ['adminUsers'], queryFn: adminApi.users },
      { queryKey: ['adminRoles'], queryFn: adminApi.roles },
      { queryKey: ['adminPermissions'], queryFn: adminApi.permissions },
    ],
  });
  const settings = useQuery({ queryKey: ['adminSettings'], queryFn: adminApi.settings });
  const createUser = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setForm(initialForm);
      setFormError(null);
      setIsCreateOpen(false);
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'USERNAME_ALREADY_EXISTS') {
        setFormError('Username already exists.');
        return;
      }

      setFormError('Could not create user. Check the fields and try again.');
    },
  });

  function updateField<K extends keyof CreateUserForm>(key: K, value: CreateUserForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function closeCreateModal() {
    if (createUser.isPending) {
      return;
    }

    setIsCreateOpen(false);
    setFormError(null);
  }

  function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.username.trim() || !form.displayName.trim() || !form.password || !form.roleId) {
      setFormError('Username, name, password, and role are required.');
      return;
    }

    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    createUser.mutate({
      username: form.username.trim(),
      password: form.password,
      displayName: form.displayName.trim(),
      roleId: Number(form.roleId),
      status: form.status,
      maxDiscountPercent: form.maxDiscountPercent === '' ? null : Number(form.maxDiscountPercent),
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Administration</h1>
        </div>
        {canManageUsers ? (
          <Button type="button" icon={<Plus size={18} />} onClick={() => setIsCreateOpen(true)}>
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
          ]} />
        </article>
        <article className="panel">
          <h2>Roles</h2>
          <DataTable rows={roles.data?.items ?? []} isLoading={roles.isLoading} emptyText="No roles found" getRowKey={(r) => r.id} columns={[
            { key: 'code', header: 'Code', render: (r) => r.code },
            { key: 'name', header: 'Name', render: (r) => r.name_ru },
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

      <Modal title="Add user" isOpen={isCreateOpen} onClose={closeCreateModal}>
        <form className="form-stack" onSubmit={handleCreateUser}>
          <Input
            label="Username"
            name="username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            autoComplete="off"
          />
          <Input
            label="Display name"
            name="displayName"
            value={form.displayName}
            onChange={(event) => updateField('displayName', event.target.value)}
            autoComplete="off"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            autoComplete="new-password"
          />
          <Select
            label="Role"
            name="roleId"
            value={form.roleId}
            onChange={(event) => updateField('roleId', event.target.value)}
          >
            <option value="">Select role</option>
            {(roles.data?.items ?? [])
              .filter((role) => role.is_active)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.code}
                </option>
              ))}
          </Select>
          <Select
            label="Status"
            name="status"
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as CreateUserForm['status'])}
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="locked">Locked</option>
          </Select>
          <Input
            label="Max discount percent"
            name="maxDiscountPercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.maxDiscountPercent}
            onChange={(event) => updateField('maxDiscountPercent', event.target.value)}
          />
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="form-actions">
            <Button type="button" variant="secondary" disabled={createUser.isPending} onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createUser.isPending}>
              Create user
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
