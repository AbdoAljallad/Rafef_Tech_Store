import { LogOut, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../modules/auth/stores/authStore';
import { avatars } from '../../assets/avatars';

type UserCardProps = {
  isHomePage?: boolean;
};

export function UserCard({ isHomePage = false }: UserCardProps) {
  const { t } = useTranslation(['common', 'auth']);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const displayName = user?.displayName || t('common:user.guest');
  const roleName = user?.role.nameRu || 'Доступ не назначен';
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
          <div className="user-card-meta" aria-label="Состояние смены и доступа">
            <span className="user-online-row">
              <i aria-hidden="true" />
              Онлайн
            </span>
            <span>
              <em>Смена</em>
              <strong>Активна</strong>
            </span>
            <span>
              <em>Отдел</em>
              <strong>Управление</strong>
            </span>
            <span>
              <em>Доступ</em>
              <strong>{roleName}</strong>
            </span>
          </div>
        ) : null}
      </div>

      {isHomePage ? (
        <div className="user-card-actions" aria-label="Действия профиля">
          <Link className="icon-button user-card-action" to="/settings/profile" aria-label="Открыть профиль">
            <UserRound size={18} />
            <span>Профиль</span>
          </Link>
          <button className="icon-button user-card-action logout" type="button" onClick={handleLogout} aria-label={t('auth:logout')}>
            <LogOut size={18} />
            <span>Выйти</span>
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
