import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit2, ImageMinus, ImagePlus, Plus, RotateCcw, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../modules/admin/api/admin.api';
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

function formatDate(
  value: string | null,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!value) {
    return t('empty', { ns: 'common' });
  }

  return new Date(value).toLocaleString(locale);
}

function formatUserStatus(status: UserStatus, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`settings.users.status.${status}`, { ns: 'app' });
}

function getRoleLabel(
  code: string | undefined,
  fallback: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (code) {
    return t(`settings.roles.${code}`, { ns: 'app', defaultValue: fallback ?? code });
  }

  return fallback ?? t('userCard.noRole', { ns: 'app' });
}

function getModuleLabel(module: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`settings.modules.${module}`, { ns: 'app', defaultValue: module });
}

export function SettingsUsersPage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const locale = i18n.language === 'ar' ? 'ar' : 'ru-RU';
  const navigate = useNavigate();
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

  const stats = useMemo(() => {
    const activeUsers = userRows.filter((user) => user.status === 'active').length;
    const lockedUsers = userRows.filter((user) => user.status === 'locked').length;
    const disabledUsers = userRows.filter((user) => user.status === 'disabled').length;

    return {
      totalUsers: userRows.length,
      activeUsers,
      lockedUsers,
      disabledUsers,
      totalRoles: roleRows.length,
      totalPermissions: permissionRows.length,
    };
  }, [permissionRows.length, roleRows.length, userRows]);

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
    onError: () => setPermissionError(t('settings.users.errors.permissionsUpdateFailed', { ns: 'app' })),
  });

  const resetPermissions = useMutation({
    mutationFn: adminApi.resetUserPermissions,
    onSuccess: async (response) => {
      await invalidateUsers();
      setSelectedPermissionIds(new Set(response.user.permissionIds ?? []));
      setPermissionError(null);
    },
    onError: () => setPermissionError(t('settings.users.errors.permissionsResetFailed', { ns: 'app' })),
  });

  function userErrorMessage(error: unknown) {
    if (isApiError(error)) {
      if (error.code === 'USERNAME_ALREADY_EXISTS') return t('settings.users.errors.usernameExists', { ns: 'app' });
      if (error.code === 'CANNOT_DISABLE_SELF') return t('settings.users.errors.cannotDisableSelf', { ns: 'app' });
      if (error.code === 'ROLE_NOT_FOUND') return t('settings.users.errors.roleNotFound', { ns: 'app' });
      if (error.code === 'INVALID_IMAGE') return t('settings.users.errors.invalidImage', { ns: 'app' });
    }

    return t('settings.users.errors.saveFailed', { ns: 'app' });
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
    if (currentUser?.id === user.id) {
      navigate('/settings/profile');
      return;
    }

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
    if (createUser.isPending || updateUser.isPending) {
      return;
    }

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
      setFormError(t('settings.users.errors.onlyImages', { ns: 'app' }));
      event.target.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormError(t('settings.users.errors.imageTooLarge', { ns: 'app' }));
      event.target.value = '';
      return;
    }

    try {
      const imageData = await readFileAsDataUrl(file);
      updateField('avatarUrl', imageData);
      setFormError(null);
    } catch {
      setFormError(t('settings.users.errors.fileReadFailed', { ns: 'app' }));
    } finally {
      event.target.value = '';
    }
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.username.trim() || !form.displayName.trim() || !form.roleId) {
      setFormError(t('settings.users.errors.required', { ns: 'app' }));
      return;
    }

    if (mode === 'create' && form.password.length < 8) {
      setFormError(t('settings.users.errors.passwordMin', { ns: 'app' }));
      return;
    }

    if (mode === 'edit' && form.password && form.password.length < 8) {
      setFormError(t('settings.users.errors.newPasswordMin', { ns: 'app' }));
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
    if (!permissionUser) {
      return;
    }

    savePermissions.mutate({
      userId: permissionUser.id,
      permissionIds: Array.from(selectedPermissionIds),
    });
  }

  const userModalTitle =
    mode === 'create' ? t('settings.users.modals.createTitle', { ns: 'app' }) : t('settings.users.modals.editTitle', { ns: 'app' });

  return (
    <>
      <style>{`
        .settings-users-shell {
          display: grid;
          gap: 1rem;
        }

        .settings-users-header {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
        }

        .settings-return-link {
          text-decoration: none;
        }

        .settings-users-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .settings-users-hero {
          display: grid;
          gap: 1rem;
          border: 1px solid rgba(125, 211, 252, 0.24);
          border-radius: 28px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(240, 249, 255, 0.8)),
            radial-gradient(circle at top right, rgba(66, 165, 255, 0.12), transparent 34%);
          box-shadow: 0 18px 42px rgba(46, 103, 153, 0.12);
          padding: 1.15rem;
        }

        .settings-users-hero-top {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          align-items: start;
          justify-content: space-between;
        }

        .settings-users-hero-copy {
          display: grid;
          gap: 0.35rem;
          max-width: 720px;
        }

        .settings-users-hero-copy h2,
        .settings-users-hero-copy p {
          margin: 0;
        }

        .settings-users-hero-copy p:last-child {
          color: var(--color-text-muted);
          line-height: 1.55;
        }

        .settings-users-quicklinks {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
        }

        .settings-users-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.75rem;
        }

        .settings-users-metric {
          display: grid;
          gap: 0.18rem;
          border: 1px solid rgba(125, 211, 252, 0.2);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.76);
          padding: 0.9rem;
        }

        .settings-users-metric span {
          color: var(--color-text-muted);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .settings-users-metric strong {
          font-size: 1.3rem;
          color: var(--tech-text);
        }

        .settings-users-grid {
          display: grid;
          gap: 1rem;
        }

        .settings-users-panel-title {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }

        .settings-users-panel-title h2,
        .settings-users-panel-title p {
          margin: 0;
        }

        .settings-users-panel-title p {
          color: var(--color-text-muted);
        }

        .settings-user-preview {
          display: grid;
          gap: 0.85rem;
          border: 1px solid rgba(125, 211, 252, 0.26);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.78);
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
          width: 84px;
          height: 84px;
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
          width: 40px;
          height: 40px;
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

        .settings-user-table-copy {
          min-width: 0;
        }

        .settings-user-table-copy strong,
        .settings-user-table-copy div {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-user-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(8, 120, 215, 0.18);
          color: var(--color-primary-strong);
          font-size: 0.72rem;
          font-weight: 800;
          margin-left: 0.45rem;
          padding: 0.18rem 0.5rem;
        }

        .settings-users-status {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(125, 211, 252, 0.24);
          background: rgba(255, 255, 255, 0.76);
          color: var(--tech-text);
          font-size: 0.78rem;
          font-weight: 800;
          padding: 0.32rem 0.72rem;
        }

        .settings-users-modal-actions {
          position: static;
          border-top: 1px solid rgba(125, 211, 252, 0.22);
          background: transparent;
          padding-top: 1rem;
        }

        @media (max-width: 720px) {
          .settings-users-header,
          .settings-users-hero-top {
            align-items: stretch;
          }

          .settings-users-actions {
            width: 100%;
          }

          .settings-users-actions .ui-button {
            flex: 1 1 auto;
          }

          .settings-user-preview-card {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="page-header settings-users-header">
        <div>
          <p className="eyebrow">{t('settings.eyebrow', { ns: 'app' })}</p>
          <h1>{t('settings.users.title', { ns: 'app' })}</h1>
        </div>
        <div className="settings-users-actions">
          <Link className="ui-button secondary settings-return-link" to="/settings">
            <ArrowLeft size={16} />
            <span>{t('settings.back', { ns: 'app' })}</span>
          </Link>
          {canManageUsers ? (
            <Button type="button" icon={<Plus size={18} />} onClick={openCreate}>
              {t('settings.users.addUser', { ns: 'app' })}
            </Button>
          ) : null}
        </div>
      </header>

      <section className="settings-users-shell">
        <article className="settings-users-hero">
          <div className="settings-users-hero-top">
            <div className="settings-users-hero-copy">
              <p className="eyebrow">{t('settings.users.heroEyebrow', { ns: 'app' })}</p>
              <h2>{t('settings.users.heroTitle', { ns: 'app' })}</h2>
              <p>{t('settings.users.heroText', { ns: 'app' })}</p>
            </div>

            <div className="settings-users-quicklinks">
              <Link className="ui-button secondary settings-return-link" to="/settings/profile">
                <UserRound size={16} />
                <span>{t('settings.users.myProfile', { ns: 'app' })}</span>
              </Link>
            </div>
          </div>

          <div className="settings-users-metrics">
            <div className="settings-users-metric">
              <span>{t('settings.users.metrics.totalUsers', { ns: 'app' })}</span>
              <strong>{stats.totalUsers}</strong>
            </div>
            <div className="settings-users-metric">
              <span>{t('settings.users.metrics.activeUsers', { ns: 'app' })}</span>
              <strong>{stats.activeUsers}</strong>
            </div>
            <div className="settings-users-metric">
              <span>{t('settings.users.metrics.lockedUsers', { ns: 'app' })}</span>
              <strong>{stats.lockedUsers}</strong>
            </div>
            <div className="settings-users-metric">
              <span>{t('settings.users.metrics.disabledUsers', { ns: 'app' })}</span>
              <strong>{stats.disabledUsers}</strong>
            </div>
            <div className="settings-users-metric">
              <span>{t('settings.users.metrics.roles', { ns: 'app' })}</span>
              <strong>{stats.totalRoles}</strong>
            </div>
            <div className="settings-users-metric">
              <span>{t('settings.users.metrics.permissions', { ns: 'app' })}</span>
              <strong>{stats.totalPermissions}</strong>
            </div>
          </div>
        </article>

        <section className="detail-grid">
          <article className="panel">
            <div className="settings-users-panel-title">
              <div>
                <h2>{t('settings.users.panels.usersTitle', { ns: 'app' })}</h2>
                <p>{t('settings.users.panels.usersText', { ns: 'app' })}</p>
              </div>
            </div>

            <DataTable
              rows={userRows}
              isLoading={users.isLoading}
              emptyText={t('settings.users.empty.users', { ns: 'app' })}
              getRowKey={(u) => u.id}
              columns={[
                {
                  key: 'user',
                  header: t('settings.users.columns.user', { ns: 'app' }),
                  render: (u: AdminUser) => (
                    <div className="settings-user-table-cell">
                      <span className="settings-user-table-avatar" aria-hidden="true">
                        <span>{getInitials(u.display_name || u.username)}</span>
                        <img src={u.avatar_url || avatars.defaultUser} alt="" />
                      </span>
                      <div className="settings-user-table-copy">
                        <strong>
                          {u.display_name}
                          {currentUser?.id === u.id ? <span className="settings-user-badge">{t('settings.users.badges.self', { ns: 'app' })}</span> : null}
                        </strong>
                        <div>{u.username}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  header: t('settings.users.columns.role', { ns: 'app' }),
                  render: (u: AdminUser) => getRoleLabel(u.role_code, u.role_name || u.role_code, t),
                },
                {
                  key: 'status',
                  header: t('settings.users.columns.status', { ns: 'app' }),
                  render: (u: AdminUser) => <span className="settings-users-status">{formatUserStatus(u.status, t)}</span>,
                },
                {
                  key: 'login',
                  header: t('settings.users.columns.lastLogin', { ns: 'app' }),
                  render: (u: AdminUser) => formatDate(u.last_login_at, locale, t),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (u: AdminUser) => (
                    <div className="row-actions">
                      {currentUser?.id === u.id ? (
                        <IconButton
                          label={t('settings.users.actions.openProfile', { ns: 'app' })}
                          icon={<Edit2 size={16} />}
                          onClick={() => navigate('/settings/profile')}
                        />
                      ) : canManageUsers ? (
                        <IconButton
                          label={t('settings.users.actions.editUser', { ns: 'app' })}
                          icon={<Edit2 size={16} />}
                          onClick={() => openEdit(u)}
                        />
                      ) : null}
                      {canManagePermissions ? (
                        <IconButton
                          label={t('settings.users.actions.managePermissions', { ns: 'app' })}
                          icon={<ShieldCheck size={16} />}
                          onClick={() => void openPermissions(u)}
                        />
                      ) : null}
                      {canManageUsers && currentUser?.id !== u.id ? (
                        <IconButton
                          label={t('settings.users.actions.deleteUser', { ns: 'app' })}
                          icon={<Trash2 size={16} />}
                          onClick={() => setDeleteUser(u)}
                        />
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          </article>

          <article className="panel">
            <div className="settings-users-panel-title">
              <div>
                <h2>{t('settings.users.panels.rolesTitle', { ns: 'app' })}</h2>
                <p>{t('settings.users.panels.rolesText', { ns: 'app' })}</p>
              </div>
            </div>

            <DataTable
              rows={roleRows}
              isLoading={roles.isLoading}
              emptyText={t('settings.users.empty.roles', { ns: 'app' })}
              getRowKey={(r) => r.id}
              columns={[
                { key: 'code', header: t('settings.users.columns.code', { ns: 'app' }), render: (r: AdminRole) => r.code },
                {
                  key: 'name',
                  header: t('settings.users.columns.name', { ns: 'app' }),
                  render: (r: AdminRole) => getRoleLabel(r.code, r.name_ru, t),
                },
                {
                  key: 'status',
                  header: t('settings.users.columns.status', { ns: 'app' }),
                  render: (r: AdminRole) => (r.is_active ? t('settings.users.roleState.active', { ns: 'app' }) : t('settings.users.roleState.inactive', { ns: 'app' })),
                },
              ]}
            />
          </article>
        </section>

        <section className="panel">
          <div className="settings-users-panel-title">
            <div>
              <h2>{t('settings.users.panels.permissionsTitle', { ns: 'app' })}</h2>
              <p>{t('settings.users.panels.permissionsText', { ns: 'app' })}</p>
            </div>
          </div>

          <DataTable
            rows={permissionRows}
            isLoading={permissions.isLoading}
            emptyText={t('settings.users.empty.permissions', { ns: 'app' })}
            getRowKey={(p) => p.id}
            columns={[
              {
                key: 'module',
                header: t('settings.users.columns.module', { ns: 'app' }),
                render: (p: AdminPermission) => getModuleLabel(p.module, t),
              },
              { key: 'code', header: t('settings.users.columns.code', { ns: 'app' }), render: (p: AdminPermission) => p.code },
              { key: 'name', header: t('settings.users.columns.name', { ns: 'app' }), render: (p: AdminPermission) => p.name_ru || p.code },
            ]}
          />
        </section>
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
                <p className="eyebrow">{t('settings.users.preview.eyebrow', { ns: 'app' })}</p>
                <strong>{form.displayName || t('settings.users.preview.newUser', { ns: 'app' })}</strong>
                <small>{form.username || t('settings.users.preview.usernamePlaceholder', { ns: 'app' })}</small>
                <small>
                  {roleRows.find((role) => String(role.id) === form.roleId)
                    ? getRoleLabel(roleRows.find((role) => String(role.id) === form.roleId)?.code, roleRows.find((role) => String(role.id) === form.roleId)?.name_ru, t)
                    : t('settings.users.preview.rolePlaceholder', { ns: 'app' })}
                </small>
              </div>
            </div>

            <div className="settings-user-avatar-actions">
              <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleAvatarChange(event)} />
              <Button type="button" variant="secondary" icon={<ImagePlus size={16} />} onClick={() => avatarInputRef.current?.click()}>
                {form.avatarUrl ? t('settings.users.buttons.changePhoto', { ns: 'app' }) : t('settings.users.buttons.addPhoto', { ns: 'app' })}
              </Button>
              {form.avatarUrl ? (
                <Button type="button" variant="secondary" icon={<ImageMinus size={16} />} onClick={() => updateField('avatarUrl', null)}>
                  {t('settings.users.buttons.removePhoto', { ns: 'app' })}
                </Button>
              ) : null}
            </div>
          </div>

          <Input
            label={t('settings.users.fields.username', { ns: 'app' })}
            name="username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            autoComplete="off"
          />
          <Input
            label={t('settings.users.fields.displayName', { ns: 'app' })}
            name="displayName"
            value={form.displayName}
            onChange={(event) => updateField('displayName', event.target.value)}
            autoComplete="off"
          />
          <Input
            label={mode === 'create' ? t('settings.users.fields.password', { ns: 'app' }) : t('settings.users.fields.newPassword', { ns: 'app' })}
            name="password"
            type="password"
            value={form.password}
            placeholder={mode === 'edit' ? t('settings.users.fields.passwordHint', { ns: 'app' }) : undefined}
            onChange={(event) => updateField('password', event.target.value)}
            autoComplete="new-password"
          />
          <Select
            label={t('settings.users.fields.role', { ns: 'app' })}
            name="roleId"
            value={form.roleId}
            onChange={(event) => updateField('roleId', event.target.value)}
          >
            <option value="">{t('settings.users.fields.selectRole', { ns: 'app' })}</option>
            {roleRows
              .filter((role) => role.is_active)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {getRoleLabel(role.code, role.name_ru, t)}
                </option>
              ))}
          </Select>
          <Select
            label={t('settings.users.fields.status', { ns: 'app' })}
            name="status"
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as UserStatus)}
          >
            <option value="active">{t('settings.users.status.active', { ns: 'app' })}</option>
            <option value="disabled">{t('settings.users.status.disabled', { ns: 'app' })}</option>
            <option value="locked">{t('settings.users.status.locked', { ns: 'app' })}</option>
          </Select>
          <Input
            label={t('settings.users.fields.maxDiscount', { ns: 'app' })}
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
              label={t('settings.users.fields.resetPermissionsToRole', { ns: 'app' })}
              checked={form.resetPermissionsToRole}
              onChange={(event) => updateField('resetPermissionsToRole', event.target.checked)}
            />
          ) : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="form-actions settings-users-modal-actions">
            <Button type="button" variant="secondary" disabled={createUser.isPending || updateUser.isPending} onClick={closeUserModal}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" isLoading={createUser.isPending || updateUser.isPending}>
              {t('settings.users.buttons.saveUser', { ns: 'app' })}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title={t('settings.users.modals.permissionsTitle', { ns: 'app' })} isOpen={Boolean(permissionUser)} onClose={() => setPermissionUser(null)}>
        <div className="form-stack">
          <p>
            <strong>{permissionUser?.username}</strong>
          </p>
          <div className="permission-groups">
            {permissionsByModule.map(([module, modulePermissions]) => (
              <section className="permission-group" key={module}>
                <h3>{getModuleLabel(module, t)}</h3>
                {modulePermissions.map((permission) => (
                  <Checkbox
                    key={permission.id}
                    label={permission.name_ru || permission.code}
                    checked={selectedPermissionIds.has(permission.id)}
                    onChange={() => togglePermission(permission.id)}
                  />
                ))}
              </section>
            ))}
          </div>
          {permissionError ? <p className="form-error">{permissionError}</p> : null}
          <div className="form-actions settings-users-modal-actions">
            <Button
              type="button"
              variant="secondary"
              icon={<RotateCcw size={16} />}
              disabled={!permissionUser || resetPermissions.isPending || savePermissions.isPending}
              onClick={() => permissionUser && resetPermissions.mutate(permissionUser.id)}
            >
              {t('settings.users.actions.restoreRolePermissions', { ns: 'app' })}
            </Button>
            <Button type="button" variant="secondary" disabled={savePermissions.isPending} onClick={() => setPermissionUser(null)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button type="button" isLoading={savePermissions.isPending} onClick={submitPermissions}>
              {t('settings.users.actions.savePermissions', { ns: 'app' })}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        title={t('settings.users.confirmDelete.title', { ns: 'app' })}
        message={t('settings.users.confirmDelete.message', {
          ns: 'app',
          username: deleteUser?.username ?? t('settings.users.confirmDelete.fallbackUser', { ns: 'app' }),
        })}
        isOpen={Boolean(deleteUser)}
        confirmLabel={t('settings.users.confirmDelete.confirmLabel', { ns: 'app' })}
        cancelLabel={t('actions.cancel', { ns: 'common' })}
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && removeUser.mutate(deleteUser.id)}
      />
    </>
  );
}
