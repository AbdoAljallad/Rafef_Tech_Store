import { useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  Cog,
  CreditCard,
  Database,
  Globe2,
  HardDrive,
  MoonStar,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SunMedium,
  UserRound,
  Waves,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import { avatars } from '../../shared/assets/avatars';
import { PermissionGate } from '../../shared/permissions/PermissionGate';
import {
  useSystemPreferencesStore,
  type SystemAccent,
  type SystemLanguage,
  type SystemTheme,
} from '../../shared/stores/systemPreferencesStore';

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

const languageOptions: Array<{ value: SystemLanguage; short: string; label: string; note: string }> = [
  { value: 'ru', short: 'RU', label: 'Русский', note: 'Основной рабочий язык интерфейса' },
  { value: 'ar', short: 'AR', label: 'العربية', note: 'Подготовлено для арабской локализации' },
];

const themeOptions: Array<{ value: SystemTheme; label: string; note: string; icon: typeof SunMedium }> = [
  { value: 'light', label: 'Светлая', note: 'Чистая дневная тема с мягким контрастом', icon: SunMedium },
  { value: 'night', label: 'Тёмная', note: 'Глубокая тёмная тема без агрессивного неона', icon: MoonStar },
  { value: 'ice', label: 'Ледяная', note: 'Светлый холодный режим для аккуратных рабочих панелей', icon: Waves },
  { value: 'custom', label: 'Пользовательская', note: 'Адаптивная тема, зависящая от выбранной цветовой палитры', icon: Sparkles },
];

const accentOptions: Array<{ value: SystemAccent; label: string; note: string; gradient: string }> = [
  { value: 'blue', label: 'Синий', note: 'Универсальный корпоративный вариант', gradient: 'linear-gradient(135deg, #5db7ff, #1f7ae0)' },
  { value: 'gold', label: 'Жёлтый', note: 'Тёплый деловой акцент для витрины и продаж', gradient: 'linear-gradient(135deg, #ffd86b, #c89212)' },
  { value: 'red', label: 'Красный', note: 'Энергичный сценарий для активной торговли', gradient: 'linear-gradient(135deg, #ff98a5, #d34b58)' },
  { value: 'emerald', label: 'Изумрудный', note: 'Свежий технологичный тон для сервиса и склада', gradient: 'linear-gradient(135deg, #63e0b7, #169d72)' },
  { value: 'violet', label: 'Фиолетовый', note: 'Более премиальный и мягкий контраст', gradient: 'linear-gradient(135deg, #baa3ff, #7c5ce0)' },
];

const navigationCards = [
  {
    icon: UserRound,
    title: 'Мой профиль',
    description: 'Измените имя, логин, фото, пароль и просмотрите историю собственных действий.',
    to: '/settings/profile',
  },
  {
    icon: CreditCard,
    title: 'Платёжные настройки',
    description: 'Откройте способы оплаты и финансовые параметры, влияющие на продажи и возвраты.',
    to: '/finance/payment-methods',
  },
  {
    icon: Cog,
    title: 'Системные счета',
    description: 'Перейдите к служебным счетам, кассам и финансовым объектам системы.',
    to: '/finance/accounts',
  },
];

const settingsDomainCards = [
  {
    icon: BellRing,
    title: 'Уведомления и автоматизация',
    items: [
      { label: 'Порог низкого остатка', value: '7 единиц' },
      { label: 'Критические уведомления', value: 'Telegram + внутренняя лента' },
      { label: 'Тикер событий', value: 'Обновление каждые 30 секунд' },
      { label: 'Автосоздание задач', value: 'Включено для ремонта и проектов' },
    ],
  },
  {
    icon: UserRound,
    title: 'CRM и клиенты',
    items: [
      { label: 'Код клиента', value: 'Автоматический формат CUST-####' },
      { label: 'Основные каналы связи', value: 'Телефон, WhatsApp, Telegram' },
      { label: 'Фото клиента', value: 'До 4 МБ на изображение' },
      { label: 'Статус заморозки', value: 'Доступен для менеджеров CRM' },
    ],
  },
  {
    icon: HardDrive,
    title: 'Склад и ремонт',
    items: [
      { label: 'Резервирование товара', value: '72 часа для активных заказов' },
      { label: 'Контроль серийных номеров', value: 'Включён для техники и аксессуаров' },
      { label: 'Маршрут ремонта', value: 'Приём -> Диагностика -> Работа -> Выдача' },
      { label: 'Списание запчастей', value: 'После перехода ремонта в финальную фазу' },
    ],
  },
  {
    icon: Database,
    title: 'Продажи, финансы и безопасность',
    items: [
      { label: 'Окно черновика продажи', value: '24 часа' },
      { label: 'Максимальная скидка', value: 'Зависит от роли пользователя' },
      { label: 'Закрытие смены', value: 'Обязательно до 23:30' },
      { label: 'Резервные копии', value: 'Хранение 14 дней' },
    ],
  },
];

export function SettingsPage() {
  const currentUser = useAuthStore((state) => state.user);
  const theme = useSystemPreferencesStore((state) => state.theme);
  const language = useSystemPreferencesStore((state) => state.language);
  const accent = useSystemPreferencesStore((state) => state.accent);
  const setTheme = useSystemPreferencesStore((state) => state.setTheme);
  const setLanguage = useSystemPreferencesStore((state) => state.setLanguage);
  const setAccent = useSystemPreferencesStore((state) => state.setAccent);

  const [workspaceSettings, setWorkspaceSettings] = useState({
    compactSidebar: false,
    showTicker: true,
    autoRefresh: true,
    quickActions: true,
  });

  const displayName = currentUser?.displayName || 'Пользователь';
  const roleName = currentUser?.role.nameRu || 'Роль не назначена';
  const avatarSrc = currentUser?.avatarUrl || avatars.defaultUser;
  const initials = getInitials(displayName);

  const currentLanguage = languageOptions.find((option) => option.value === language) ?? languageOptions[0];
  const currentTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const currentAccent = accentOptions.find((option) => option.value === accent) ?? accentOptions[0];
  const CurrentThemeIcon = currentTheme.icon;

  const overviewStats = useMemo(
    () => [
      { label: 'Активных системных политик', value: '28' },
      { label: 'Готовых демо-наборов', value: '12' },
      { label: 'Модулей с настройками', value: '12' },
      { label: 'Проверочных сценариев', value: '21' },
    ],
    [],
  );

  function toggleWorkspaceSetting(key: keyof typeof workspaceSettings) {
    setWorkspaceSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <>
      <style>{`
        .settings-shell {
          display: grid;
          gap: 1rem;
        }

        .settings-hero {
          display: grid;
          gap: 1rem;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, var(--color-border));
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, color-mix(in srgb, var(--accent-soft) 18%, transparent), transparent 38%),
            linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 92%, white), color-mix(in srgb, var(--color-surface-muted) 82%, var(--accent-soft) 18%));
          box-shadow: var(--theme-panel-shadow);
          padding: 1.15rem;
        }

        .settings-hero-top {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 1rem;
          align-items: center;
        }

        .settings-hero-avatar {
          position: relative;
          width: 94px;
          height: 94px;
          border-radius: 50%;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 32% 22%, rgb(255 255 255 / 95%), transparent 34%),
            linear-gradient(145deg, color-mix(in srgb, var(--accent-soft) 20%, #ffffff), color-mix(in srgb, var(--accent-primary) 10%, #f1f7ff));
          color: var(--color-primary-strong);
          border: 2px solid color-mix(in srgb, var(--accent-primary) 34%, transparent);
          box-shadow:
            0 0 0 4px rgb(255 255 255 / 66%),
            0 14px 30px color-mix(in srgb, var(--accent-primary) 14%, rgba(46, 103, 153, 0.12)),
            0 0 24px color-mix(in srgb, var(--accent-primary) 14%, transparent);
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
          gap: 0.35rem;
          min-width: 0;
        }

        .settings-hero-copy h2,
        .settings-hero-copy p {
          margin: 0;
        }

        .settings-hero-copy p:last-child {
          color: var(--color-text-muted);
          line-height: 1.55;
        }

        .settings-hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .settings-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, var(--color-border));
          background: color-mix(in srgb, var(--color-surface) 84%, transparent);
          font-size: 0.76rem;
          font-weight: 800;
          padding: 0.35rem 0.72rem;
        }

        .settings-overview-grid,
        .settings-control-grid,
        .settings-domain-grid,
        .settings-grid {
          display: grid;
          gap: 1rem;
        }

        .settings-overview-grid {
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        }

        .settings-control-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .settings-domain-grid,
        .settings-grid {
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }

        .settings-overview-card,
        .settings-panel-card,
        .settings-card-link {
          display: grid;
          gap: 0.75rem;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 16%, var(--color-border));
          border-radius: 24px;
          background: linear-gradient(145deg, var(--theme-panel-fill-start), var(--theme-panel-fill-end));
          padding: 1.05rem;
          box-shadow: var(--theme-panel-shadow);
        }

        .settings-overview-card span,
        .settings-domain-list span,
        .settings-workspace-note {
          color: var(--color-text-muted);
        }

        .settings-overview-card strong {
          font-size: 1.45rem;
          color: var(--tech-text);
        }

        .settings-panel-card h3,
        .settings-panel-card p,
        .settings-card-link h3,
        .settings-card-link p {
          margin: 0;
        }

        .settings-panel-head {
          display: flex;
          gap: 0.8rem;
          align-items: start;
        }

        .settings-panel-icon,
        .settings-card-icon {
          width: 46px;
          height: 46px;
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 16px;
          background: color-mix(in srgb, var(--accent-soft) 18%, var(--color-surface));
          color: var(--color-primary-strong);
          border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, var(--color-border));
        }

        .settings-card-link {
          color: inherit;
          text-decoration: none;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }

        .settings-card-link:hover {
          transform: translateY(-1px);
          box-shadow: var(--theme-button-shadow);
          border-color: color-mix(in srgb, var(--accent-primary) 30%, var(--color-border));
        }

        .settings-choice-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 0.75rem;
        }

        .settings-choice-button,
        .settings-accent-button {
          display: grid;
          gap: 0.25rem;
          text-align: left;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 16%, var(--color-border));
          border-radius: 20px;
          background: color-mix(in srgb, var(--color-surface) 88%, transparent);
          color: var(--tech-text);
          padding: 0.9rem;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .settings-choice-button:hover,
        .settings-choice-button:focus-visible,
        .settings-accent-button:hover,
        .settings-accent-button:focus-visible {
          border-color: color-mix(in srgb, var(--accent-primary) 34%, var(--color-border));
          box-shadow: var(--theme-action-shadow);
          transform: translateY(-1px);
        }

        .settings-choice-button.active,
        .settings-accent-button.active {
          border-color: color-mix(in srgb, var(--accent-primary) 38%, var(--color-border));
          background: linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 92%, white), color-mix(in srgb, var(--color-surface-muted) 80%, var(--accent-soft) 20%));
          box-shadow: var(--theme-action-shadow);
        }

        .settings-choice-button strong,
        .settings-choice-button small,
        .settings-accent-button strong,
        .settings-accent-button small {
          margin: 0;
        }

        .settings-choice-button small,
        .settings-accent-button small {
          color: var(--color-text-muted);
          line-height: 1.5;
        }

        .settings-choice-top {
          display: flex;
          gap: 0.55rem;
          align-items: center;
          justify-content: space-between;
        }

        .settings-choice-short {
          display: inline-flex;
          min-width: 42px;
          justify-content: center;
          align-items: center;
          border-radius: 999px;
          background: color-mix(in srgb, var(--accent-primary) 12%, white);
          color: var(--color-primary-strong);
          font-size: 0.78rem;
          font-weight: 900;
          padding: 0.28rem 0.55rem;
        }

        .settings-choice-check {
          color: var(--color-primary-strong);
          font-size: 0.76rem;
          font-weight: 900;
        }

        .settings-accent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
        }

        .settings-accent-top {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
        }

        .settings-accent-preview {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .settings-workspace-list,
        .settings-domain-list {
          display: grid;
          gap: 0.65rem;
        }

        .settings-workspace-row,
        .settings-domain-row {
          display: flex;
          gap: 0.75rem;
          align-items: start;
          justify-content: space-between;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 14%, var(--color-border));
          border-radius: 18px;
          background: color-mix(in srgb, var(--color-surface) 82%, transparent);
          padding: 0.8rem 0.9rem;
        }

        .settings-workspace-row label {
          display: flex;
          gap: 0.7rem;
          align-items: start;
          cursor: pointer;
        }

        .settings-workspace-row input {
          margin-top: 0.2rem;
        }

        .settings-domain-row strong,
        .settings-domain-row span {
          display: block;
        }

        .settings-domain-row strong:last-child {
          text-align: right;
        }

        .settings-section-title {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: end;
          justify-content: space-between;
        }

        .settings-section-title h2,
        .settings-section-title p {
          margin: 0;
        }

        .settings-section-title p {
          color: var(--color-text-muted);
        }

        @media (max-width: 920px) {
          .settings-control-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .settings-hero-top {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="page-header">
        <div>
          <p className="eyebrow">Настройки</p>
          <h1>Центр системных настроек</h1>
        </div>
      </header>

      <section className="settings-shell">
        <article className="settings-hero">
          <div className="settings-hero-top">
            <div className="settings-hero-avatar" aria-hidden="true">
              <span>{initials}</span>
              <img src={avatarSrc} alt="" />
            </div>

            <div className="settings-hero-copy">
              <p className="eyebrow">Панель конфигурации</p>
              <h2>{displayName}</h2>
              <p>{roleName}</p>
              <p>
                Здесь собраны настройки внешнего вида, языковая среда, цветовые палитры и системные параметры,
                которые помогают довести интерфейс до аккуратного и цельного состояния.
              </p>
              <div className="settings-hero-badges">
                <span className="settings-hero-badge">
                  <Globe2 size={14} />
                  Язык: {currentLanguage.label}
                </span>
                <span className="settings-hero-badge">
                  <CurrentThemeIcon size={14} />
                  Тема: {currentTheme.label}
                </span>
                <span className="settings-hero-badge">
                  <Palette size={14} />
                  Палитра: {currentAccent.label}
                </span>
                <span className="settings-hero-badge">
                  <RefreshCw size={14} />
                  Демо-режим наполнения активен
                </span>
              </div>
            </div>
          </div>

          <div className="settings-overview-grid">
            {overviewStats.map((stat) => (
              <div className="settings-overview-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <section className="settings-control-grid">
          <article className="settings-panel-card">
            <div className="settings-panel-head">
              <span className="settings-panel-icon" aria-hidden="true">
                <Sparkles size={22} />
              </span>
              <div>
                <h3>Тема и языковая среда</h3>
                <p>Тёмная тема теперь более спокойная, а пользовательская палитра подстраивает весь интерфейс под выбранный цвет.</p>
              </div>
            </div>

            <div className="settings-choice-grid">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    className={`settings-choice-button${theme === option.value ? ' active' : ''}`}
                    type="button"
                    onClick={() => setTheme(option.value)}
                  >
                    <div className="settings-choice-top">
                      <span className="settings-choice-short">
                        <Icon size={14} />
                      </span>
                      {theme === option.value ? <span className="settings-choice-check">Активна</span> : null}
                    </div>
                    <strong>{option.label}</strong>
                    <small>{option.note}</small>
                  </button>
                );
              })}
            </div>

            <div className="settings-choice-grid">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  className={`settings-choice-button${language === option.value ? ' active' : ''}`}
                  type="button"
                  onClick={() => setLanguage(option.value)}
                >
                  <div className="settings-choice-top">
                    <span className="settings-choice-short">{option.short}</span>
                    {language === option.value ? <span className="settings-choice-check">Выбран</span> : null}
                  </div>
                  <strong>{option.label}</strong>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="settings-panel-card">
            <div className="settings-panel-head">
              <span className="settings-panel-icon" aria-hidden="true">
                <Palette size={22} />
              </span>
              <div>
                <h3>Пользовательская цветовая палитра</h3>
                <p>Выберите основной цвет, и интерфейс подстроит кнопки, ссылки, карточки, фоновые свечения и вспомогательные акценты.</p>
              </div>
            </div>

            <div className="settings-accent-grid">
              {accentOptions.map((option) => (
                <button
                  key={option.value}
                  className={`settings-accent-button${accent === option.value ? ' active' : ''}`}
                  type="button"
                  onClick={() => setAccent(option.value)}
                >
                  <div className="settings-accent-top">
                    <span className="settings-accent-preview" style={{ background: option.gradient }} aria-hidden="true" />
                    {accent === option.value ? <Check size={18} aria-hidden="true" /> : null}
                  </div>
                  <strong>{option.label}</strong>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="settings-panel-card">
          <div className="settings-panel-head">
            <span className="settings-panel-icon" aria-hidden="true">
              <Wrench size={22} />
            </span>
            <div>
              <h3>Операционные настройки рабочего места</h3>
              <p>Локальные сценарии, которые удобно включать и отключать при развитии интерфейсов и внутренних модулей.</p>
            </div>
          </div>

          <div className="settings-workspace-list">
            <div className="settings-workspace-row">
              <label htmlFor="compactSidebar">
                <input
                  id="compactSidebar"
                  type="checkbox"
                  checked={workspaceSettings.compactSidebar}
                  onChange={() => toggleWorkspaceSetting('compactSidebar')}
                />
                <span>
                  <strong>Компактный режим боковой панели</strong>
                  <span className="settings-workspace-note">Уменьшает визуальный вес навигации для плотных рабочих экранов.</span>
                </span>
              </label>
            </div>

            <div className="settings-workspace-row">
              <label htmlFor="showTicker">
                <input
                  id="showTicker"
                  type="checkbox"
                  checked={workspaceSettings.showTicker}
                  onChange={() => toggleWorkspaceSetting('showTicker')}
                />
                <span>
                  <strong>Показывать тикер уведомлений</strong>
                  <span className="settings-workspace-note">Полезно при отладке ленты событий и визуализации приоритетов.</span>
                </span>
              </label>
            </div>

            <div className="settings-workspace-row">
              <label htmlFor="autoRefresh">
                <input
                  id="autoRefresh"
                  type="checkbox"
                  checked={workspaceSettings.autoRefresh}
                  onChange={() => toggleWorkspaceSetting('autoRefresh')}
                />
                <span>
                  <strong>Автообновление карточек данных</strong>
                  <span className="settings-workspace-note">Удобно для дашбордов, очередей, склада и оперативных продаж.</span>
                </span>
              </label>
            </div>

            <div className="settings-workspace-row">
              <label htmlFor="quickActions">
                <input
                  id="quickActions"
                  type="checkbox"
                  checked={workspaceSettings.quickActions}
                  onChange={() => toggleWorkspaceSetting('quickActions')}
                />
                <span>
                  <strong>Быстрые действия на ключевых страницах</strong>
                  <span className="settings-workspace-note">Подходит для CRM, ремонта, склада, POS и финансовых карточек.</span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section-title">
          <div>
            <h2>Настройки модулей и демонстрационные политики</h2>
            <p>Блоки ниже помогают развивать интерфейс даже там, где рабочая бизнес-логика ещё только расширяется.</p>
          </div>
        </section>

        <section className="settings-domain-grid">
          {settingsDomainCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="settings-panel-card" key={card.title}>
                <div className="settings-panel-head">
                  <span className="settings-panel-icon" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3>{card.title}</h3>
                  </div>
                </div>

                <div className="settings-domain-list">
                  {card.items.map((item) => (
                    <div className="settings-domain-row" key={item.label}>
                      <strong>{item.label}</strong>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="settings-panel-card">
          <div className="settings-panel-head">
            <span className="settings-panel-icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h3>Пакеты демо-данных для развития системы</h3>
              <p>Добавлены небольшие тестовые наборы, чтобы можно было развивать витрины, детали, таблицы и карточки без ожидания реальных операций.</p>
            </div>
          </div>

          <div className="settings-domain-grid">
            <div className="settings-overview-card">
              <span>Товары</span>
              <strong>6 позиций</strong>
              <span>Аксессуары, кабели и комплектующие с ценами, штрихкодами и остатками.</span>
            </div>
            <div className="settings-overview-card">
              <span>Финансовые документы</span>
              <strong>3 счета</strong>
              <span>Небольшой набор draft/approved/voided для теста списков и деталей.</span>
            </div>
            <div className="settings-overview-card">
              <span>Заказы</span>
              <strong>2 ремонта</strong>
              <span>Пара тестовых заказов с устройствами, статусами и заметками для отладки UI.</span>
            </div>
            <div className="settings-overview-card">
              <span>Клиенты</span>
              <strong>Не изменяются</strong>
              <span>Для демо-сценариев используются уже существующие активные клиенты из базы.</span>
            </div>
          </div>
        </section>

        <section className="settings-section-title">
          <div>
            <h2>Быстрые переходы</h2>
            <p>Ключевые страницы настроек и связанные рабочие разделы системы.</p>
          </div>
        </section>

        <section className="settings-grid">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link className="settings-card-link" key={card.title} to={card.to}>
                <span className="settings-card-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </Link>
            );
          })}

          <PermissionGate permission="auth.users.view">
            <Link className="settings-card-link" to="/settings/users">
              <span className="settings-card-icon" aria-hidden="true">
                <ShieldCheck size={22} />
              </span>
              <h3>Управление пользователями</h3>
              <p>Отдельный раздел для пользователей, ролей и прав доступа без смешивания с личным профилем.</p>
            </Link>
          </PermissionGate>
        </section>
      </section>
    </>
  );
}
