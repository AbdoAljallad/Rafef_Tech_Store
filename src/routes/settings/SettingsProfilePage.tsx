import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock3, ImageMinus, ImagePlus, Save, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authApi } from '../../modules/auth/api/auth.api';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import type { SelfProfile } from '../../modules/auth/types/auth.types';
import { isApiError } from '../../shared/api/apiErrors';
import { avatars } from '../../shared/assets/avatars';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

type ProfileForm = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  currentPassword: string;
  newPassword: string;
};

const activityLabelKeys: Record<string, string> = {
  'auth.login': 'settings.profile.activityLabels.authLogin',
  'auth.logout': 'settings.profile.activityLabels.authLogout',
  'auth.profile.update': 'settings.profile.activityLabels.authProfileUpdate',
  'auth.user.create': 'settings.profile.activityLabels.authUserCreate',
  'auth.user.update': 'settings.profile.activityLabels.authUserUpdate',
  'auth.user.delete': 'settings.profile.activityLabels.authUserDelete',
  'auth.user.permissions.update': 'settings.profile.activityLabels.authUserPermissionsUpdate',
  'auth.user.permissions.reset': 'settings.profile.activityLabels.authUserPermissionsReset',
};

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

function formatDate(
  value: string | null | undefined,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!value) {
    return t('empty', { ns: 'common' });
  }

  return new Date(value).toLocaleString(locale);
}

function formatActivity(actionCode: string, t: (key: string, options?: Record<string, unknown>) => string) {
  const labelKey = activityLabelKeys[actionCode];
  if (!labelKey) {
    return actionCode;
  }

  return t(labelKey, { ns: 'app' });
}

function formatStatus(status: SelfProfile['status'], t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`settings.profile.status.${status}`, { ns: 'app' });
}

function getRoleLabel(
  code: string | undefined,
  fallback: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (code) {
    return t(`settings.roles.${code}`, { ns: 'app', defaultValue: fallback ?? t('userCard.noRole', { ns: 'app' }) });
  }

  return fallback ?? t('userCard.noRole', { ns: 'app' });
}

function getModuleLabel(module: string, t: (key: string, options?: Record<string, unknown>) => string) {
  return t(`settings.modules.${module}`, { ns: 'app', defaultValue: module });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('FILE_READ_ERROR'));
    reader.readAsDataURL(file);
  });
}

export function SettingsProfilePage() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const locale = i18n.language === 'ar' ? 'ar' : 'ru-RU';
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    username: '',
    displayName: '',
    avatarUrl: null,
    currentPassword: '',
    newPassword: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['auth-profile'],
    queryFn: authApi.profile,
    select: (response) => response.profile,
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setForm({
      username: profileQuery.data.username,
      displayName: profileQuery.data.displayName,
      avatarUrl: profileQuery.data.avatarUrl ?? null,
      currentPassword: '',
      newPassword: '',
    });
  }, [profileQuery.data]);

  const avatarPreview = form.avatarUrl || avatars.defaultUser;
  const avatarInitials = useMemo(() => getInitials(form.displayName || form.username || 'Rafef Tech'), [form.displayName, form.username]);

  const updateProfile = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: async (response) => {
      const profile = response.profile;
      useAuthStore.setState((state) => ({
        ...state,
        user: {
          ...state.user!,
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl ?? null,
          lastLoginAt: profile.lastLoginAt ?? null,
          role: profile.role,
          permissions: profile.permissions,
          maxDiscountPercent: profile.maxDiscountPercent,
        },
        permissions: new Set(profile.permissions),
      }));
      await profileQuery.refetch();
      setForm((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
      }));
      setFormError(null);
      setSuccessMessage(t('settings.profile.success', { ns: 'app' }));
    },
    onError: (error) => {
      if (isApiError(error)) {
        if (error.code === 'USERNAME_ALREADY_EXISTS') {
          setFormError(t('settings.profile.errors.usernameExists', { ns: 'app' }));
          return;
        }
        if (error.code === 'CURRENT_PASSWORD_REQUIRED') {
          setFormError(t('settings.profile.errors.currentPasswordRequired', { ns: 'app' }));
          return;
        }
        if (error.code === 'CURRENT_PASSWORD_INVALID') {
          setFormError(t('settings.profile.errors.currentPasswordInvalid', { ns: 'app' }));
          return;
        }
        if (error.code === 'INVALID_IMAGE') {
          setFormError(t('settings.profile.errors.invalidImage', { ns: 'app' }));
          return;
        }
      }

      setFormError(t('settings.profile.errors.updateFailed', { ns: 'app' }));
    },
  });

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormError(t('settings.profile.errors.onlyImages', { ns: 'app' }));
      event.target.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormError(t('settings.profile.errors.imageTooLarge', { ns: 'app' }));
      event.target.value = '';
      return;
    }

    try {
      const imageData = await readFileAsDataUrl(file);
      updateField('avatarUrl', imageData);
      setFormError(null);
      setSuccessMessage(null);
    } catch {
      setFormError(t('settings.profile.errors.fileReadFailed', { ns: 'app' }));
    } finally {
      event.target.value = '';
    }
  }

  function submit() {
    setFormError(null);
    setSuccessMessage(null);

    if (!form.username.trim() || !form.displayName.trim()) {
      setFormError(t('settings.profile.errors.required', { ns: 'app' }));
      return;
    }

    if (form.newPassword && form.newPassword.length < 8) {
      setFormError(t('settings.profile.errors.newPasswordMin', { ns: 'app' }));
      return;
    }

    updateProfile.mutate({
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      avatarUrl: form.avatarUrl,
      currentPassword: form.currentPassword || undefined,
      newPassword: form.newPassword || undefined,
    });
  }

  const profile = profileQuery.data as SelfProfile | undefined;

  return (
    <>
      <style>{`
        .settings-profile-shell {
          display: grid;
          gap: 1rem;
        }

        .settings-profile-header {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
        }

        .settings-return-link {
          text-decoration: none;
        }

        .settings-profile-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 1rem;
          align-items: start;
        }

        .settings-profile-column {
          display: grid;
          gap: 1rem;
        }

        .settings-profile-card {
          display: grid;
          gap: 1rem;
          border: 1px solid rgba(125, 211, 252, 0.24);
          border-radius: 26px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(240, 249, 255, 0.8)),
            radial-gradient(circle at top right, rgba(66, 165, 255, 0.12), transparent 34%);
          box-shadow: 0 18px 42px rgba(46, 103, 153, 0.12);
          padding: 1.15rem;
        }

        .settings-profile-card h2,
        .settings-profile-card h3,
        .settings-profile-card p {
          margin: 0;
        }

        .settings-profile-hero {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 1rem;
          align-items: center;
        }

        .settings-profile-avatar {
          position: relative;
          width: 118px;
          height: 118px;
          border-radius: 50%;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 32% 22%, rgb(255 255 255 / 96%), transparent 34%),
            linear-gradient(145deg, #ffffff, #eaf7ff 72%, #dff1ff);
          color: var(--color-primary-strong);
          border: 3px solid rgb(87 174 245 / 42%);
          box-shadow:
            0 0 0 6px rgb(255 255 255 / 74%),
            0 20px 36px rgb(46 103 153 / 14%),
            0 0 28px rgb(66 165 255 / 16%);
          font-size: 1.6rem;
          font-weight: 900;
          letter-spacing: 0.06em;
        }

        .settings-profile-avatar img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .settings-profile-avatar span {
          position: relative;
          z-index: 0;
        }

        .settings-profile-copy {
          display: grid;
          gap: 0.45rem;
          min-width: 0;
        }

        .settings-profile-copy h2,
        .settings-profile-copy p,
        .settings-profile-copy strong {
          overflow-wrap: anywhere;
        }

        .settings-profile-role {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 0.45rem;
          border: 1px solid rgba(8, 120, 215, 0.18);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.84);
          color: var(--color-primary-strong);
          font-size: 0.82rem;
          font-weight: 800;
          padding: 0.38rem 0.8rem;
        }

        .settings-profile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
        }

        .settings-profile-pill {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 0.4rem;
          border-radius: 999px;
          border: 1px solid rgba(125, 211, 252, 0.26);
          background: rgba(255, 255, 255, 0.76);
          color: var(--color-text-muted);
          font-size: 0.78rem;
          font-weight: 800;
          padding: 0.35rem 0.75rem;
        }

        .settings-profile-avatar-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
        }

        .settings-profile-facts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .settings-profile-fact {
          display: grid;
          gap: 0.2rem;
          border: 1px solid rgba(125, 211, 252, 0.2);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.74);
          padding: 0.9rem;
        }

        .settings-profile-fact span {
          color: var(--color-text-muted);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .settings-profile-stack {
          display: grid;
          gap: 0.85rem;
        }

        .settings-profile-note {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          line-height: 1.55;
        }

        .settings-profile-success {
          color: #206a3b;
          font-weight: 800;
        }

        .settings-profile-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.65rem;
          padding-top: 0.2rem;
        }

        .settings-profile-activity {
          position: sticky;
          top: 1rem;
        }

        .settings-profile-activity-list {
          display: grid;
          gap: 0.75rem;
        }

        .settings-profile-activity-item {
          display: grid;
          gap: 0.35rem;
          border: 1px solid rgba(125, 211, 252, 0.18);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.76);
          padding: 0.95rem;
        }

        .settings-profile-activity-item strong {
          color: var(--tech-text);
        }

        .settings-profile-activity-item small {
          color: var(--color-text-muted);
        }

        @media (max-width: 1024px) {
          .settings-profile-grid {
            grid-template-columns: 1fr;
          }

          .settings-profile-activity {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .settings-profile-hero {
            grid-template-columns: 1fr;
            justify-items: start;
          }

          .settings-profile-facts {
            grid-template-columns: 1fr;
          }

          .settings-profile-actions {
            justify-content: stretch;
          }

          .settings-profile-actions .ui-button {
            flex: 1 1 auto;
          }
        }
      `}</style>

      <header className="page-header settings-profile-header">
        <div>
          <p className="eyebrow">{t('settings.eyebrow', { ns: 'app' })}</p>
          <h1>{t('settings.profile.title', { ns: 'app' })}</h1>
        </div>
        <Link className="ui-button secondary settings-return-link" to="/settings">
          <ArrowLeft size={16} />
          <span>{t('settings.back', { ns: 'app' })}</span>
        </Link>
      </header>

      {profileQuery.isLoading ? <section className="panel">{t('settings.profile.loading', { ns: 'app' })}</section> : null}
      {profileQuery.isError ? <section className="panel">{t('settings.profile.error', { ns: 'app' })}</section> : null}

      {profile ? (
        <section className="settings-profile-shell">
          <section className="settings-profile-grid">
            <div className="settings-profile-column">
              <article className="settings-profile-card">
                <div className="settings-profile-hero">
                  <div className="settings-profile-avatar" aria-hidden="true">
                    <span>{avatarInitials}</span>
                    <img src={avatarPreview} alt="" />
                  </div>

                  <div className="settings-profile-copy">
                    <p className="eyebrow">{t('settings.profile.accountEyebrow', { ns: 'app' })}</p>
                    <h2>{form.displayName || profile.displayName}</h2>
                    <p>@{form.username || profile.username}</p>
                    <span className="settings-profile-role">
                      <ShieldCheck size={15} />
                      {getRoleLabel(profile.role.code, profile.role.nameRu, t)}
                    </span>
                    <div className="settings-profile-meta">
                      <span className="settings-profile-pill">{formatStatus(profile.status, t)}</span>
                      <span className="settings-profile-pill">
                        <Clock3 size={14} />
                        {t('settings.profile.lastLogin', { ns: 'app' })}: {formatDate(profile.lastLoginAt, locale, t)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="settings-profile-avatar-actions">
                  <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleAvatarChange(event)} />
                  <Button type="button" variant="secondary" icon={<ImagePlus size={16} />} onClick={() => avatarInputRef.current?.click()}>
                    {form.avatarUrl ? t('settings.profile.buttons.changePhoto', { ns: 'app' }) : t('settings.profile.buttons.addPhoto', { ns: 'app' })}
                  </Button>
                  {form.avatarUrl ? (
                    <Button type="button" variant="secondary" icon={<ImageMinus size={16} />} onClick={() => updateField('avatarUrl', null)}>
                      {t('settings.profile.buttons.removePhoto', { ns: 'app' })}
                    </Button>
                  ) : null}
                </div>

                <div className="settings-profile-facts">
                  <div className="settings-profile-fact">
                    <span>{t('settings.profile.facts.role', { ns: 'app' })}</span>
                    <strong>{getRoleLabel(profile.role.code, profile.role.nameRu, t)}</strong>
                  </div>
                  <div className="settings-profile-fact">
                    <span>{t('settings.profile.facts.status', { ns: 'app' })}</span>
                    <strong>{formatStatus(profile.status, t)}</strong>
                  </div>
                  <div className="settings-profile-fact">
                    <span>{t('settings.profile.facts.lastLogin', { ns: 'app' })}</span>
                    <strong>{formatDate(profile.lastLoginAt, locale, t)}</strong>
                  </div>
                  <div className="settings-profile-fact">
                    <span>{t('settings.profile.facts.permissions', { ns: 'app' })}</span>
                    <strong>{profile.permissions.length}</strong>
                  </div>
                </div>
              </article>

              <article className="settings-profile-card">
                <div className="settings-profile-stack">
                  <div>
                    <h3>{t('settings.profile.basicTitle', { ns: 'app' })}</h3>
                    <p className="settings-profile-note">{t('settings.profile.basicText', { ns: 'app' })}</p>
                  </div>
                  <Input
                    label={t('settings.profile.fields.username', { ns: 'app' })}
                    value={form.username}
                    onChange={(event) => updateField('username', event.target.value)}
                    autoComplete="username"
                  />
                  <Input
                    label={t('settings.profile.fields.displayName', { ns: 'app' })}
                    value={form.displayName}
                    onChange={(event) => updateField('displayName', event.target.value)}
                    autoComplete="name"
                  />
                </div>
              </article>

              <article className="settings-profile-card">
                <div className="settings-profile-stack">
                  <div>
                    <h3>{t('settings.profile.securityTitle', { ns: 'app' })}</h3>
                    <p className="settings-profile-note">{t('settings.profile.securityText', { ns: 'app' })}</p>
                  </div>
                  <Input
                    label={t('settings.profile.fields.currentPassword', { ns: 'app' })}
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) => updateField('currentPassword', event.target.value)}
                    autoComplete="current-password"
                  />
                  <Input
                    label={t('settings.profile.fields.newPassword', { ns: 'app' })}
                    type="password"
                    value={form.newPassword}
                    onChange={(event) => updateField('newPassword', event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </article>

              <article className="settings-profile-card">
                {formError ? <p className="form-error">{formError}</p> : null}
                {successMessage ? <p className="settings-profile-success">{successMessage}</p> : null}
                <div className="settings-profile-actions">
                  <Button type="button" icon={<Save size={16} />} isLoading={updateProfile.isPending} onClick={submit}>
                    {t('settings.profile.buttons.save', { ns: 'app' })}
                  </Button>
                </div>
              </article>
            </div>

            <aside className="settings-profile-column">
              <article className="settings-profile-card settings-profile-activity">
                <div className="settings-profile-stack">
                  <div>
                    <h3>{t('settings.profile.historyTitle', { ns: 'app' })}</h3>
                    <p className="settings-profile-note">{t('settings.profile.historyText', { ns: 'app' })}</p>
                  </div>

                  <div className="settings-profile-activity-list">
                    {profile.recentActivity.length > 0 ? (
                      profile.recentActivity.map((activity) => (
                        <div className="settings-profile-activity-item" key={activity.id}>
                          <strong>{formatActivity(activity.actionCode, t)}</strong>
                          <small>
                            {t('settings.profile.activityFields.module', { ns: 'app' })}: {getModuleLabel(activity.module, t)}
                          </small>
                          <small>
                            {t('settings.profile.activityFields.date', { ns: 'app' })}: {formatDate(activity.createdAt, locale, t)}
                          </small>
                          <small>
                            {t('settings.profile.activityFields.ip', { ns: 'app' })}: {activity.ipAddress || t('empty', { ns: 'common' })}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="settings-profile-note">{t('settings.profile.historyEmpty', { ns: 'app' })}</p>
                    )}
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </section>
      ) : null}
    </>
  );
}
