import { BellRing, Boxes, CircleDollarSign, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WidgetCard } from '../../../shared/widgets/WidgetCard';

export function WidgetArea() {
  const { t } = useTranslation(['app', 'modules']);

  return (
    <section className="widget-grid command-center-widget-grid">
      <div className="command-center-widget-wrap">
        <WidgetCard
          title={t('commandCenter.widgets.todayTitle')}
          description={t('commandCenter.widgets.todayDescription')}
        >
          <div className="command-center-widget-body">
            <span className="command-center-widget-icon"><Sparkles size={18} /></span>
            <ul className="command-center-list">
              <li>{t('commandCenter.widgetItems.today1')}</li>
              <li>{t('commandCenter.widgetItems.today2')}</li>
              <li>{t('commandCenter.widgetItems.today3')}</li>
            </ul>
          </div>
        </WidgetCard>
      </div>

      <div className="command-center-widget-wrap">
        <WidgetCard
          title={t('commandCenter.widgets.notificationsTitle')}
          description={t('commandCenter.widgets.notificationsDescription')}
        >
          <div className="command-center-widget-body">
            <span className="command-center-widget-icon"><BellRing size={18} /></span>
            <ul className="command-center-list">
              <li>{t('commandCenter.widgetItems.note1')}</li>
              <li>{t('commandCenter.widgetItems.note2')}</li>
              <li>{t('commandCenter.widgetItems.note3')}</li>
            </ul>
            <Link className="tech-action command-center-inline-action" to="/events">
              {t('commandCenter.openEvents')}
            </Link>
          </div>
        </WidgetCard>
      </div>

      <div className="command-center-widget-wrap">
        <WidgetCard
          title={t('commandCenter.widgets.stockTitle')}
          description={t('commandCenter.widgets.stockDescription')}
        >
          <div className="command-center-widget-body">
            <span className="command-center-widget-icon"><Boxes size={18} /></span>
            <ul className="command-center-list">
              <li>{t('commandCenter.widgetItems.stock1')}</li>
              <li>{t('commandCenter.widgetItems.stock2')}</li>
              <li>{t('commandCenter.widgetItems.stock3')}</li>
            </ul>
            <Link className="tech-action command-center-inline-action" to="/inventory/stock">
              {t('modules:navigation.inventory')}
            </Link>
          </div>
        </WidgetCard>
      </div>

      <div className="command-center-widget-wrap">
        <WidgetCard
          title={t('commandCenter.widgets.financeTitle')}
          description={t('commandCenter.widgets.financeDescription')}
        >
          <div className="command-center-widget-body">
            <span className="command-center-widget-icon"><CircleDollarSign size={18} /></span>
            <ul className="command-center-list">
              <li>{t('commandCenter.widgetItems.finance1')}</li>
              <li>{t('commandCenter.widgetItems.finance2')}</li>
              <li>{t('commandCenter.widgetItems.finance3')}</li>
            </ul>
            <Link className="tech-action command-center-inline-action" to="/sales/pos">
              {t('commandCenter.quickActions.sales')}
            </Link>
          </div>
        </WidgetCard>
      </div>
    </section>
  );
}
