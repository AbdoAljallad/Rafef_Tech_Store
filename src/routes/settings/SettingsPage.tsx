import { Cog, CreditCard, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import { avatars } from '../../shared/assets/avatars';
import { PermissionGate } from '../../shared/permissions/PermissionGate';

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

export function SettingsPage() {
  const currentUser = useAuthStore((state) => state.user);
  const displayName = currentUser?.displayName || 'Пользователь';
  const roleName = currentUser?.role.nameRu || 'Роль не назначена';
  const avatarSrc = currentUser?.avatarUrl || avatars.defaultUser;
  const initials = getInitials(displayName);

  return (
    <>
      <style>{`
        .settings-shell {
          display: grid;
          gap: 1rem;
        }

        .settings-hero {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 1rem;
          align-items: center;
          border: 1px solid rgba(125, 211, 252, 0.26);
          border-radius: 28px;
          background: linear-gradient(145deg, rgb(255 255 255 / 90%), rgb(240 249 255 / 76%));
          box-shadow: 0 18px 44px rgb(46 103 153 / 12%);
          padding: 1.15rem;
        }

        .settings-hero-avatar {
          position: relative;
          width: 86px;
          height: 86px;
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

        .settings-hero-avatar img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .settings-hero-avatar span {
          position: relative;
          z-index: 0;
        }

        .settings-hero-copy {
          display: grid;
          gap: 0.32rem;
          min-width: 0;
        }

        .settings-hero-copy p {
          margin: 0;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .settings-card-link {
          display: grid;
          gap: 0.75rem;
          border: 1px solid rgba(125, 211, 252, 0.26);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.78);
          color: inherit;
          padding: 1.1rem;
          text-decoration: none;
          box-shadow: 0 16px 38px rgb(46 103 153 / 10%);
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }

        .settings-card-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 42px rgb(46 103 153 / 14%);
          border-color: rgba(66, 165, 255, 0.3);
        }

        .settings-card-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.82);
          color: var(--color-primary-strong);
          border: 1px solid rgba(125, 211, 252, 0.24);
        }

        .settings-card-link h3,
        .settings-card-link p {
          margin: 0;
        }

        .settings-card-link p {
          color: var(--color-text-muted);
          line-height: 1.55;
        }

        @media (max-width: 720px) {
          .settings-hero {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="page-header">
        <div>
          <p className="eyebrow">Настройки</p>
          <h1>Центр настроек</h1>
        </div>
      </header>

      <section className="settings-shell">
        <article className="settings-hero">
          <div className="settings-hero-avatar" aria-hidden="true">
            <span>{initials}</span>
            <img src={avatarSrc} alt="" />
          </div>
          <div className="settings-hero-copy">
            <p className="eyebrow">ВАШ АККАУНТ</p>
            <h2>{displayName}</h2>
            <p>{roleName}</p>
            <p>Здесь собраны ваш профиль, управление пользователями и основные системные переходы.</p>
          </div>
        </article>

        <section className="settings-grid">
          <Link className="settings-card-link" to="/settings/profile">
            <span className="settings-card-icon" aria-hidden="true">
              <UserRound size={22} />
            </span>
            <h3>Мой профиль</h3>
            <p>Измените своё имя, логин, фото, пароль и просмотрите историю собственных действий в системе.</p>
          </Link>

          <PermissionGate permission="auth.users.view">
            <Link className="settings-card-link" to="/settings/users">
              <span className="settings-card-icon" aria-hidden="true">
                <ShieldCheck size={22} />
              </span>
              <h3>Управление пользователями</h3>
              <p>Отдельный раздел для пользователей, ролей и прав доступа без смешивания с вашим личным профилем.</p>
            </Link>
          </PermissionGate>

          <Link className="settings-card-link" to="/finance/payment-methods">
            <span className="settings-card-icon" aria-hidden="true">
              <CreditCard size={22} />
            </span>
            <h3>Платёжные настройки</h3>
            <p>Быстрый переход к способам оплаты и связанным финансовым параметрам системы.</p>
          </Link>

          <Link className="settings-card-link" to="/finance/accounts">
            <span className="settings-card-icon" aria-hidden="true">
              <Cog size={22} />
            </span>
            <h3>Системные счета</h3>
            <p>Откройте рабочие счета и служебные финансовые настройки, связанные с ежедневной работой команды.</p>
          </Link>
        </section>
      </section>
    </>
  );
}
