import { useTranslation } from 'react-i18next';
import { LoginForm } from '../../modules/auth/components/LoginForm';
import { logos } from '../../shared/assets/logos';

export function LoginPage() {
  const { t } = useTranslation(['auth']);

  return (
    <section className="auth-card login-card" aria-labelledby="login-title">
      <div className="login-card-glow" aria-hidden="true" />
      <div className="login-card-header">
        <span className="auth-logo-frame">
          <img src={logos.rafefTech} alt="" />
        </span>
        <div className="login-title-block">
          <h1 id="login-title">{t('auth:login.title')}</h1>
          <p className="muted">{t('auth:login.subtitle')}</p>
        </div>
        <div className="login-access-note">
          <span aria-hidden="true" />
          <strong>Локальная система управления Rafef Tech</strong>
          <small>Безопасный вход для сотрудников</small>
        </div>
      </div>

      <LoginForm />
    </section>
  );
}
