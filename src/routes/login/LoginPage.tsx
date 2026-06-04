import { useTranslation } from 'react-i18next';
import { LoginForm } from '../../modules/auth/components/LoginForm';
import { logos } from '../../shared/assets/logos';

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div>
        <div className="auth-brand">
          <img src={logos.rafefTech} alt="" />
          <p className="eyebrow">Rafef Tech</p>
        </div>
        <h1 id="login-title">{t('auth:login.title')}</h1>
        <p className="muted">{t('auth:login.subtitle')}</p>
      </div>

      <LoginForm />
    </section>
  );
}
