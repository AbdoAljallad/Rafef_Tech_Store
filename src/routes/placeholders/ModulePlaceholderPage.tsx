import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MODULE_PLACEHOLDERS } from './modulePlaceholderConfig';

type ModulePlaceholderPageProps = {
  moduleKey: string;
};

type ModuleDemoContent = {
  metrics: Array<{ label: string; value: string }>;
  lanes: Array<{ title: string; status: string; note: string }>;
};

const MODULE_DEMO_CONTENT: Record<string, ModuleDemoContent> = {
  catalog: {
    metrics: [
      { label: 'Товаров в демо-наборе', value: '128' },
      { label: 'Активных категорий', value: '14' },
      { label: 'Поставщиков', value: '9' },
    ],
    lanes: [
      { title: 'Каталог аксессуаров', status: 'Готов к дизайну', note: 'Есть SKU, миниатюры и базовые карточки.' },
      { title: 'История цен', status: 'Нужен график', note: 'Можно развивать визуал динамики и промо-периодов.' },
      { title: 'Штрихкоды', status: 'Черновик', note: 'Достаточно данных для таблиц, фильтров и печати.' },
    ],
  },
  inventory: {
    metrics: [
      { label: 'Складских позиций', value: '86' },
      { label: 'Критических остатков', value: '12' },
      { label: 'Открытых закупок', value: '5' },
    ],
    lanes: [
      { title: 'Остатки по филиалам', status: 'Готово к макету', note: 'Демо-значения покрывают сценарий сравнений по точкам.' },
      { title: 'Движения товаров', status: 'Нужен таймлайн', note: 'Есть входящие, исходящие и внутренние перемещения.' },
      { title: 'Резервы', status: 'В работе', note: 'Подходит для отладки подсветки конфликтов и сроков.' },
    ],
  },
  repair: {
    metrics: [
      { label: 'Заказов в ремонте', value: '21' },
      { label: 'Устройств на диагностике', value: '7' },
      { label: 'Ожидаемых запчастей', value: '4' },
    ],
    lanes: [
      { title: 'Приём устройства', status: 'Готово к форме', note: 'Данных достаточно для сценариев создания и фотофиксации.' },
      { title: 'Статусы ремонта', status: 'Готово к ленте', note: 'Можно строить красивый прогресс по этапам.' },
      { title: 'Выдача клиенту', status: 'Нужен чек-лист', note: 'Подходит для финальных действий и печатных форм.' },
    ],
  },
  sales: {
    metrics: [
      { label: 'Черновиков продаж', value: '11' },
      { label: 'Возвратов за день', value: '3' },
      { label: 'Средний чек', value: '4 280 ₽' },
    ],
    lanes: [
      { title: 'POS-интерфейс', status: 'Готов к прототипу', note: 'Есть товары, клиенты и корзины для сценариев оформления.' },
      { title: 'Возвраты', status: 'В работе', note: 'Можно проверить модальные окна и причины возвратов.' },
      { title: 'Печать чеков', status: 'Подготовлено', note: 'Имеются тестовые позиции и суммы для шаблонов.' },
    ],
  },
  finance: {
    metrics: [
      { label: 'Открытых кассовых смен', value: '2' },
      { label: 'Платёжных методов', value: '6' },
      { label: 'Операций за смену', value: '37' },
    ],
    lanes: [
      { title: 'Ежедневное закрытие', status: 'Готово к UI', note: 'Тестовые цифры подходят для сверки кассы и итогов.' },
      { title: 'Расходы', status: 'Черновик', note: 'Есть суммы, категории и сценарии согласования.' },
      { title: 'Баланс клиентов', status: 'Нужен дашборд', note: 'Можно развивать карточки задолженности и оплаты.' },
    ],
  },
  creative: {
    metrics: [
      { label: 'Активных работ', value: '18' },
      { label: 'Исполнителей', value: '6' },
      { label: 'Спецификаций', value: '13' },
    ],
    lanes: [
      { title: 'Производственные задачи', status: 'Готовы к спискам', note: 'Можно настраивать приоритеты и сроки.' },
      { title: 'Подрядчики', status: 'Подготовлено', note: 'Хватает демо-карточек для построения каталога исполнителей.' },
      { title: 'Спецификации', status: 'Нужен конструктор', note: 'Данные подходят для шаблонов материалов и размеров.' },
    ],
  },
  projects: {
    metrics: [
      { label: 'Активных проектов', value: '8' },
      { label: 'Объектов монтажа', value: '17' },
      { label: 'Материалов в резерве', value: '42' },
    ],
    lanes: [
      { title: 'Объекты', status: 'Готово к карте', note: 'Можно развивать таймлайн и адресные карточки.' },
      { title: 'Материалы', status: 'Готово к таблице', note: 'Есть количество, остатки и резервирование.' },
      { title: 'Чек-листы монтажа', status: 'Черновик', note: 'Подходит для поэтапного выполнения задач.' },
    ],
  },
  events: {
    metrics: [
      { label: 'Событий в ленте', value: '54' },
      { label: 'Критических уведомлений', value: '4' },
      { label: 'Webhook-задач', value: '9' },
    ],
    lanes: [
      { title: 'Лента событий', status: 'Синхронизирована', note: 'Тестовые записи покрывают CRM, auth и склад.' },
      { title: 'Уведомления', status: 'Нужна фильтрация', note: 'Подходит для приоритетов и статусов прочтения.' },
      { title: 'Webhook outbox', status: 'Готов к таблице', note: 'Можно строить мониторинг доставки по внешним сервисам.' },
    ],
  },
  reports: {
    metrics: [
      { label: 'Шаблонов отчётов', value: '15' },
      { label: 'Финансовых срезов', value: '6' },
      { label: 'Операционных KPI', value: '12' },
    ],
    lanes: [
      { title: 'Продажи', status: 'Готовы к графикам', note: 'Есть месячные и дневные срезы для визуализации.' },
      { title: 'Склад', status: 'Подготовлено', note: 'Можно проектировать остатки, оборачиваемость и закупки.' },
      { title: 'Ремонт и проекты', status: 'Черновик', note: 'Подходит для карточек производительности и SLA.' },
    ],
  },
  integrations: {
    metrics: [
      { label: 'Сервисов на контроле', value: '5' },
      { label: 'Активных webhook-каналов', value: '7' },
      { label: 'Проверок здоровья', value: '24/день' },
    ],
    lanes: [
      { title: 'Telegram', status: 'Активен', note: 'Подходит для теста алертов и быстрых уведомлений.' },
      { title: 'n8n', status: 'На мониторинге', note: 'Можно строить статусы сценариев и повторные отправки.' },
      { title: 'OpenClaw', status: 'Черновая интеграция', note: 'Есть база для карточек состояния и логов.' },
    ],
  },
  settings: {
    metrics: [
      { label: 'Системных политик', value: '28' },
      { label: 'Пользовательских ролей', value: '5' },
      { label: 'Наборов демо-настроек', value: '9' },
    ],
    lanes: [
      { title: 'Язык и тема', status: 'Активно', note: 'Уже подключены к интерфейсу и готовы к расширению.' },
      { title: 'Права пользователей', status: 'Готово', note: 'Потоки для профиля и управления разделены.' },
      { title: 'Пустые модули', status: 'Наполняются', note: 'Добавлены демонстрационные блоки для ускорения разработки.' },
    ],
  },
};

export function ModulePlaceholderPage({ moduleKey }: ModulePlaceholderPageProps) {
  const { t } = useTranslation(['modules', 'common']);
  const config = MODULE_PLACEHOLDERS[moduleKey];
  const titleKey = config?.titleKey ?? `navigation.${moduleKey}`;
  const demoContent = MODULE_DEMO_CONTENT[moduleKey];

  return (
    <>
      <style>{`
        .placeholder-shell {
          display: grid;
          gap: 1rem;
        }

        .placeholder-demo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .placeholder-demo-card,
        .placeholder-lane {
          border: 1px solid rgba(125, 211, 252, 0.22);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 16px 38px rgb(46 103 153 / 10%);
          padding: 1rem;
        }

        .placeholder-demo-card {
          display: grid;
          gap: 0.35rem;
        }

        .placeholder-demo-card span,
        .placeholder-lane small {
          color: var(--color-text-muted);
        }

        .placeholder-demo-card strong {
          color: var(--tech-text);
          font-size: 1.4rem;
        }

        .placeholder-lane-grid {
          display: grid;
          gap: 0.85rem;
        }

        .placeholder-section-title {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: end;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .placeholder-section-title h2,
        .placeholder-section-title p {
          margin: 0;
        }

        .placeholder-section-title p {
          color: var(--color-text-muted);
        }

        .placeholder-lane {
          display: grid;
          gap: 0.3rem;
        }

        .placeholder-lane strong,
        .placeholder-lane p {
          margin: 0;
        }

        .placeholder-lane-status {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(8, 120, 215, 0.16);
          background: rgba(255, 255, 255, 0.8);
          color: var(--color-primary-strong);
          font-size: 0.76rem;
          font-weight: 800;
          padding: 0.22rem 0.6rem;
        }
      `}</style>

      <header className="page-header">
        <div>
          <p className="eyebrow">{t('common:placeholder.phaseOne')}</p>
          <h1>{t(`modules:${titleKey}`)}</h1>
        </div>
        <Link to="/home">{t('common:actions.backHome')}</Link>
      </header>

      <section className="placeholder-shell">
        <section className="module-placeholder panel" aria-labelledby={`${moduleKey}-placeholder-title`}>
          <div>
            <h2 id={`${moduleKey}-placeholder-title`}>{t('common:placeholder.moduleNotImplemented')}</h2>
            <p className="muted">
              {config ? t(`modules:${config.descriptionKey}`) : t('common:placeholder.readyForNextPhase')}
            </p>
          </div>

          {config ? (
            <ul className="placeholder-list">
              {config.plannedItemKeys.map((itemKey) => (
                <li key={itemKey}>{t(`modules:placeholderItems.${itemKey}`)}</li>
              ))}
            </ul>
          ) : null}
        </section>

        {demoContent ? (
          <>
            <section className="placeholder-demo-grid">
              {demoContent.metrics.map((metric) => (
                <article className="placeholder-demo-card" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              ))}
            </section>

            <section className="panel">
              <div className="placeholder-section-title">
                <div>
                  <h2>Демо-сценарии для развития раздела</h2>
                  <p>Эти данные добавлены специально, чтобы пустой модуль можно было развивать без ожидания реального наполнения.</p>
                </div>
              </div>

              <div className="placeholder-lane-grid">
                {demoContent.lanes.map((lane) => (
                  <article className="placeholder-lane" key={lane.title}>
                    <strong>{lane.title}</strong>
                    <span className="placeholder-lane-status">{lane.status}</span>
                    <small>{lane.note}</small>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </>
  );
}
