import { LogOut, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../modules/auth/stores/authStore';
import { avatars } from '../../assets/avatars';

type UserCardProps = {
  isHomePage?: boolean;
};

export function UserCard({ isHomePage = false }: UserCardProps) {
  const { t } = useTranslation(['common', 'auth', 'app']);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const displayName = user?.displayName || t('common:user.guest');
  const roleName = user?.role.nameRu || t('app:userCard.noRole');
  const initials = user?.avatarInitials || user?.displayName?.slice(0, 2).toUpperCase() || 'RT';
  const avatarSrc = user?.avatarUrl || avatars.defaultUser;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className={isHomePage ? 'user-card home-profile-card' : 'user-card'}>
      <div className={isHomePage ? 'avatar home-avatar' : 'avatar'} aria-hidden="true">
        <span>{initials}</span>
        <img src={avatarSrc} alt="" />
        {isHomePage ? <b className="home-avatar-status" /> : null}
      </div>

      <div className="user-card-body">
        <p className="eyebrow">{t('common:user.current')}</p>
        <strong>{displayName}</strong>
        {isHomePage ? <span className="user-role-badge">{roleName}</span> : <small>{roleName}</small>}
        {isHomePage ? (
          <div className="user-card-meta" aria-label={t('app:userCard.shiftAccessAria')}>
            <span className="user-online-row">
              <i aria-hidden="true" />
              {t('app:userCard.online')}
            </span>
            <span>
              <em>{t('app:userCard.shift')}</em>
              <strong>{t('app:userCard.activeShift')}</strong>
            </span>
            <span>
              <em>{t('app:userCard.department')}</em>
              <strong>{t('app:userCard.management')}</strong>
            </span>
            <span>
              <em>{t('app:userCard.access')}</em>
              <strong>{roleName}</strong>
            </span>
          </div>
        ) : null}
      </div>

      {isHomePage ? (
        <div className="user-card-actions" aria-label={t('app:userCard.profileActions')}>
          <Link className="icon-button user-card-action" to="/settings/profile" aria-label={t('app:userCard.openProfile')}>
            <UserRound size={18} />
            <span>{t('app:userCard.profile')}</span>
          </Link>
          <button className="icon-button user-card-action logout" type="button" onClick={handleLogout} aria-label={t('auth:logout')}>
            <LogOut size={18} />
            <span>{t('auth:logout')}</span>
          </button>
        </div>
      ) : (
        <button className="icon-button" type="button" onClick={handleLogout} aria-label={t('auth:logout')}>
          <LogOut size={18} />
        </button>
      )}
    </aside>
  );
}
