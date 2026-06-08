import { FormEvent, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { validateLogin } from '../validators/login.validator';

export function LoginForm() {
  const { t } = useTranslation(['auth', 'errors', 'validation']);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const errorCode = useAuthStore((state) => state.errorCode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateLogin({ username, password });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await login({ username, password });
      navigate('/home', { replace: true });
    } catch {
      // Error state is stored centrally and translated below.
    }
  }

  return (
    <form className="form-stack login-form" onSubmit={handleSubmit} noValidate>
      <label className="login-field">
        <span>{t('auth:login.username')}</span>
        <input
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t('auth:login.usernamePlaceholder')}
          aria-invalid={Boolean(fieldErrors.username)}
        />
        {fieldErrors.username ? <small className="field-error">{t('validation:required')}</small> : null}
      </label>

      <label className="login-field">
        <span>{t('auth:login.password')}</span>
        <span className="password-input-shell">
          <input
            name="password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('auth:login.passwordPlaceholder')}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <button
            className="password-visibility-toggle"
            type="button"
            aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {isPasswordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </span>
        {fieldErrors.password ? <small className="field-error">{t('validation:required')}</small> : null}
      </label>

      {errorCode ? <p className="form-error">{t(`errors:api.${errorCode}`, { defaultValue: t('errors:api.UNKNOWN_ERROR') })}</p> : null}

      <button className="login-submit" type="submit" disabled={isLoading}>
        {isLoading ? t('auth:login.submitting') : t('auth:login.submit')}
      </button>
    </form>
  );
}
