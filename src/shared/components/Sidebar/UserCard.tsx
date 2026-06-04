import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../modules/auth/stores/authStore';

export function UserCard() {
  const { t } = useTranslation(['common', 'auth']);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="user-card">
      <div className="avatar" aria-hidden="true">
        {user?.avatarInitials || user?.displayName?.slice(0, 2).toUpperCase() || 'RT'}
      </div>
      <div className="user-card-body">
        <p className="eyebrow">{t('common:user.current')}</p>
        <strong>{user?.displayName || t('common:user.guest')}</strong>
        <small>{user?.role.nameRu || ''}</small>
      </div>
      <button className="icon-button" type="button" onClick={handleLogout} aria-label={t('auth:logout')}>
        <LogOut size={18} />
      </button>
    </aside>
  );
}
