import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, ImagePlus, Plus, RotateCcw, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../modules/admin/api/admin.api';
import { authApi } from '../../modules/auth/api/auth.api';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import { isApiError } from '../../shared/api/apiErrors';
import { avatars } from '../../shared/assets/avatars';
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

type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role_id: number;
  role_code: string;
  role_name: string;
  status: UserStatus;
  max_discount_percent: number | string | null;
  last_login_at: string | null;
  permissionIds?: number[];
};

type AdminRole = {
  id: number;
  code: string;
  name_ru: string;
  is_active: number | boolean;
};

type AdminPermission = {
  id: number;
  code: string;
  module: string;
  name_ru: string;
};

type UserForm = {
  username: string;
  password: string;
  displayName: string;
  avatarUrl: string | null;
  roleId: string;
  status: UserStatus;
  maxDiscountPercent: string;
  resetPermissionsToRole: boolean;
};

const emptyForm: UserForm = {
  username: '',
  password: '',
  displayName: '',
  avatarUrl: null,
  roleId: '',
  status: 'active',
  maxDiscountPercent: '',
  resetPermissionsToRole: false,
};

function toForm(user: AdminUser): UserForm {
  return {
    username: user.username ?? '',
    password: '',
    displayName: user.display_name ?? '',
    avatarUrl: user.avatar_url ?? null,
    roleId: String(user.role_id ?? ''),
    status: user.status ?? 'active',
    maxDiscountPercent:
      user.max_discount_percent === null || user.max_discount_percent === undefined ? '' : String(user.max_discount_percent),
    resetPermissionsToRole: false,
  };
}

function toDiscount(value: string) {
  return value === '' ? null : Number(value);
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'RT';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('').slice(0, 2);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('FILE_READ_ERROR'));
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canManageUsers = usePermission('auth.users.manage');
  const canManagePermissions = usePermission('auth.permissions.manage');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [permissionUser, setPermissionUser] = useState<AdminUser | null>(null);
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

  const userRows = (users.data?.items ?? []) as AdminUser[];
  const roleRows = (roles.data?.items ?? []) as AdminRole[];
  const permissionRows = (permissions.data?.items ?? []) as AdminPermission[];
  const avatarPreview = form.avatarUrl || avatars.defaultUser;
  const avatarInitials = getInitials(form.displayName || form.username || 'Rafef Tech');

  const permissionsByModule = useMemo(() => {
    const grouped = new Map<string, AdminPermission[]>();
    for (const permission of permissionRows) {
      const items = grouped.get(permission.module) ?? [];
      items.push(permission);
      grouped.set(permission.module, items);
    }
    return Array.from(grouped.entries());
  }, [permissionRows]);

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

      if (selectedUser && currentUser?.id === selectedUser.id) {
        const response = await authApi.me();
        useAuthStore.setState({
          user: response.user,
          permissions: new Set(response.user.permissions ?? []),
        });
      }

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
    onError: () => setPermissionError('Не удалось обновить права доступа.'),
  });

  const resetPermissions = useMutation({
    mutationFn: adminApi.resetUserPermissions,
    onSuccess: async (response) => {
      await invalidateUsers();
      setSelectedPermissionIds(new Set(response.user.permissionIds ?? []));
      setPermissionError(null);
    },
    onError: () => setPermissionError('Не удалось восстановить права роли.'),
  });

  function userErrorMessage(error: unknown) {
    if (isApiError(error)) {
      if (error.code === 'USERNAME_ALREADY_EXISTS') return 'Пользователь с таким логином уже существует.';
      if (error.code === 'CANNOT_DISABLE_SELF') return 'Нельзя отключить или заблокировать собственную учётную запись.';
      if (error.code === 'ROLE_NOT_FOUND') return 'Выбранная роль недоступна.';
      if (error.code === 'INVALID_IMAGE') return 'Загрузите корректное изображение пользователя.';
    }

    return 'Не удалось сохранить пользователя. Проверьте поля и попробуйте снова.';
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

  function openEdit(user: AdminUser) {
    setMode('edit');
    setSelectedUser(user);
    setForm(toForm(user));
    setFormError(null);
  }

  async function openPermissions(user: AdminUser) {
    setPermissionError(null);
    const response = await adminApi.user(user.id);
    setPermissionUser(response.user as AdminUser);
    setSelectedPermissionIds(new Set(response.user.permissionIds ?? []));
  }

  function closeUserModal() {
    if (createUser.isPending || updateUser.isPending) return;
    setMode(null);
    setSelectedUser(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Можно загружать только изображения.');
      event.target.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormError('Размер изображения не должен превышать 4 МБ.');
      event.target.value = '';
      return;
    }

    try {
      const imageData = await readFileAsDataUrl(file);
      updateField('avatarUrl', imageData);
      setFormError(null);
    } catch {
      setFormError('Не удалось прочитать выбранное изображение.');
    } finally {
      event.target.value = '';
    }
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.username.trim() || !form.displayName.trim() || !form.roleId) {
      setFormError('Логин, имя и роль обязательны.');
      return;
    }

    if (mode === 'create' && form.password.length < 8) {
      setFormError('Пароль должен содержать минимум 8 символов.');
      return;
    }

    if (mode === 'edit' && form.password && form.password.length < 8) {
      setFormError('Новый пароль должен содержать минимум 8 символов.');
      return;
    }

    const payload = {
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      avatarUrl: form.avatarUrl,
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

  const userModalTitle = mode === 'create' ? 'Новый пользователь' : 'Редактировать пользователя';

  return (
    <>
      <style>{`
        .settings-user-preview {
          display: grid;
          gap: 0.85rem;
          border: 1px solid rgba(125, 211, 252, 0.26);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.74);
          padding: 1rem;
        }

        .settings-user-preview-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 0.9rem;
          align-items: center;
          border: 1px solid rgba(125, 211, 252, 0.24);
          border-radius: 20px;
          background: linear-gradient(145deg, rgb(255 255 255 / 86%), rgb(241 249 255 / 74%));
          padding: 0.95rem;
          box-shadow: 0 14px 32px rgb(46 103 153 / 10%);
        }

        .settings-user-avatar {
          position: relative;
          width: 76px;
          height: 76px;
          border-radius: 50%;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 32% 22%, rgb(255 255 255 / 95%), transparent 34%),
            linear-gradient(145deg, #ffffff, #eaf7ff 72%, #dff1ff);
          color: var(--color-primary-strong);
          border: 2px solid rgb(87 174 245 / 42%);
          box-shadow:
            0 0 0 4px rgb(255 255 255 / 66%),
            0 14px 30px rgb(46 103 153 / 12%),
            0 0 24px rgb(66 165 255 / 16%);
          font-weight: 900;
          letter-spacing: 0.06em;
        }

        .settings-user-avatar img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .settings-user-avatar span {
          position: relative;
          z-index: 0;
        }

        .settings-user-preview-copy {
          display: grid;
          gap: 0.24rem;
          min-width: 0;
        }

        .settings-user-preview-copy strong,
        .settings-user-preview-copy small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-user-preview-copy small {
          color: var(--color-text-muted);
        }

        .settings-user-avatar-actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .settings-user-table-cell {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }

        .settings-user-table-avatar {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          overflow: hidden;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          background: #11243d;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .settings-user-table-avatar img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      <header className="page-header">
        <div>
          <p className="eyebrow">Настройки</p>
          <h1>Администрирование</h1>
        </div>
        {canManageUsers ? (
          <Button type="button" icon={<Plus size={18} />} onClick={openCreate}>
            Добавить пользователя
          </Button>
        ) : null}
      </header>

      <section className="page-toolbar">
        <Link to="/finance/accounts">Платёжные счета</Link>
        <Link to="/finance/payment-methods">Способы оплаты</Link>
      </section>

      <section className="panel entity-summary">
        <h2>Основные настройки</h2>
        <p>
          <strong>Приложение:</strong> {settings.data?.settings.appName ?? 'Rafef Tech'}
        </p>
        <p>
          <strong>Авторизация:</strong> {settings.data?.settings.authMode ?? '-'}
        </p>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Пользователи</h2>
          <DataTable
            rows={userRows}
            isLoading={users.isLoading}
            emptyText="Пользователи не найдены"
            getRowKey={(u) => u.id}
            columns={[
              {
                key: 'user',
                header: 'Пользователь',
                render: (u: AdminUser) => (
                  <div className="settings-user-table-cell">
                    <span className="settings-user-table-avatar" aria-hidden="true">
                      <span>{getInitials(u.display_name || u.username)}</span>
                      <img src={u.avatar_url || avatars.defaultUser} alt="" />
                    </span>
                    <div>
                      <strong>{u.display_name}</strong>
                      <div>{u.username}</div>
                    </div>
                  </div>
                ),
              },
              { key: 'role', header: 'Роль', render: (u: AdminUser) => u.role_name || u.role_code },
              { key: 'status', header: 'Статус', render: (u: AdminUser) => u.status },
              {
                key: 'actions',
                header: '',
                render: (u: AdminUser) => (
                  <div className="row-actions">
                    {canManageUsers ? <IconButton label="Редактировать пользователя" icon={<Edit2 size={16} />} onClick={() => openEdit(u)} /> : null}
                    {canManagePermissions ? <IconButton label="Права доступа" icon={<ShieldCheck size={16} />} onClick={() => void openPermissions(u)} /> : null}
                    {canManageUsers && currentUser?.id !== u.id ? (
                      <IconButton label="Удалить пользователя" icon={<Trash2 size={16} />} onClick={() => setDeleteUser(u)} />
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </article>

        <article className="panel">
          <h2>Роли</h2>
          <DataTable
            rows={roleRows}
            isLoading={roles.isLoading}
            emptyText="Роли не найдены"
            getRowKey={(r) => r.id}
            columns={[
              { key: 'code', header: 'Код', render: (r: AdminRole) => r.code },
              { key: 'name', header: 'Название', render: (r: AdminRole) => r.name_ru },
              { key: 'status', header: 'Статус', render: (r: AdminRole) => (r.is_active ? 'Активна' : 'Отключена') },
            ]}
          />
        </article>
      </section>

      <section className="panel">
        <h2>Права доступа</h2>
        <DataTable
          rows={permissionRows}
          isLoading={permissions.isLoading}
          emptyText="Права доступа не найдены"
          getRowKey={(p) => p.id}
          columns={[
            { key: 'module', header: 'Модуль', render: (p: AdminPermission) => p.module },
            { key: 'code', header: 'Код', render: (p: AdminPermission) => p.code },
            { key: 'name', header: 'Название', render: (p: AdminPermission) => p.name_ru },
          ]}
        />
      </section>

      <Modal title={userModalTitle} isOpen={mode !== null} onClose={closeUserModal}>
        <form className="form-stack" onSubmit={submitUser}>
          <div className="settings-user-preview">
            <div className="settings-user-preview-card">
              <div className="settings-user-avatar" aria-hidden="true">
                <span>{avatarInitials}</span>
                <img src={avatarPreview} alt="" />
              </div>
              <div className="settings-user-preview-copy">
                <p className="eyebrow">ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ</p>
                <strong>{form.displayName || 'Новый пользователь'}</strong>
                <small>{form.username || 'Логин будет показан здесь'}</small>
                <small>{roleRows.find((role) => String(role.id) === form.roleId)?.name_ru ?? 'Роль ещё не выбрана'}</small>
              </div>
            </div>

            <div className="settings-user-avatar-actions">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => void handleAvatarChange(event)}
              />
              <Button type="button" variant="secondary" icon={<ImagePlus size={16} />} onClick={() => avatarInputRef.current?.click()}>
                {form.avatarUrl ? 'Изменить фото' : 'Добавить фото'}
              </Button>
              {form.avatarUrl ? (
                <Button type="button" variant="secondary" onClick={() => updateField('avatarUrl', null)}>
                  Удалить фото
                </Button>
              ) : null}
            </div>
          </div>

          <Input label="Логин" name="username" value={form.username} onChange={(event) => updateField('username', event.target.value)} autoComplete="off" />
          <Input label="Отображаемое имя" name="displayName" value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} autoComplete="off" />
          <Input
            label={mode === 'create' ? 'Пароль' : 'Новый пароль'}
            name="password"
            type="password"
            value={form.password}
            placeholder={mode === 'edit' ? 'Оставьте пустым, чтобы не менять пароль' : undefined}
            onChange={(event) => updateField('password', event.target.value)}
            autoComplete="new-password"
          />
          <Select label="Роль" name="roleId" value={form.roleId} onChange={(event) => updateField('roleId', event.target.value)}>
            <option value="">Выберите роль</option>
            {roleRows
              .filter((role) => role.is_active)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name_ru}
                </option>
              ))}
          </Select>
          <Select label="Статус" name="status" value={form.status} onChange={(event) => updateField('status', event.target.value as UserStatus)}>
            <option value="active">Активен</option>
            <option value="disabled">Отключён</option>
            <option value="locked">Заблокирован</option>
          </Select>
          <Input
            label="Максимальная скидка, %"
            name="maxDiscountPercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.maxDiscountPercent}
            onChange={(event) => updateField('maxDiscountPercent', event.target.value)}
          />
          {mode === 'edit' ? (
            <Checkbox
              label="Сбросить права пользователя к настройкам роли"
              checked={form.resetPermissionsToRole}
              onChange={(event) => updateField('resetPermissionsToRole', event.target.checked)}
            />
          ) : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="form-actions">
            <Button type="button" variant="secondary" disabled={createUser.isPending || updateUser.isPending} onClick={closeUserModal}>
              Отмена
            </Button>
            <Button type="submit" isLoading={createUser.isPending || updateUser.isPending}>
              Сохранить пользователя
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title="Права пользователя" isOpen={Boolean(permissionUser)} onClose={() => setPermissionUser(null)}>
        <div className="form-stack">
          <p>
            <strong>{permissionUser?.username}</strong>
          </p>
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
              Вернуть права роли
            </Button>
            <Button type="button" variant="secondary" disabled={savePermissions.isPending} onClick={() => setPermissionUser(null)}>
              Отмена
            </Button>
            <Button type="button" isLoading={savePermissions.isPending} onClick={submitPermissions}>
              Сохранить права
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        title="Удалить пользователя"
        message={`Удалить ${deleteUser?.username ?? 'этого пользователя'}? Учётная запись будет отключена, а активные сессии будут завершены.`}
        isOpen={Boolean(deleteUser)}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && removeUser.mutate(deleteUser.id)}
      />
    </>
  );
}
