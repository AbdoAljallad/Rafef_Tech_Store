import { RadialMenu } from '../../modules/home/components/RadialMenu';

const HOME_WIDGETS = [
  { label: 'Сегодняшние продажи', value: '0 EGP', trend: '+0%', tone: 'sales' },
  { label: 'Заказы на ремонт', value: '0', trend: 'В очереди', tone: 'repair' },
  { label: 'Товары на складе', value: '0', trend: 'Сводка скоро', tone: 'stock' },
  { label: 'Новые клиенты', value: '0', trend: 'CRM виджет', tone: 'clients' },
] as const;

export function HomePage() {
  return (
    <div className="home-workspace">
      <div className="home-tech-grid" aria-hidden="true" />
      <div className="home-particle-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <RadialMenu />
      <aside className="home-widget-stack" aria-label="Ключевые показатели">
        {HOME_WIDGETS.map((widget) => (
          <article className={`home-widget-zone ${widget.tone}`} key={widget.label}>
            <div className="home-widget-heading">
              <span className="home-widget-kicker">Показатель</span>
              <span className="home-widget-trend">{widget.trend}</span>
            </div>
            <div>
              <h2>{widget.label}</h2>
              <p>{widget.value}</p>
            </div>
            <div className="home-widget-sparkline" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </article>
        ))}
      </aside>
    </div>
  );
}
