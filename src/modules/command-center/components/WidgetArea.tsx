import { useTranslation } from 'react-i18next';
import { WidgetCard } from '../../../shared/widgets/WidgetCard';

export function WidgetArea() {
  const { t } = useTranslation(['modules', 'common']);

  return (
    <section className="widget-grid">
      <WidgetCard
        title={t('modules:widgets.todayActivity')}
        description={t('common:placeholder.readyForNextPhase')}
      />
      <WidgetCard title={t('modules:widgets.notifications')} description={t('common:ticker.empty')} />
      <WidgetCard title={t('modules:widgets.lowStock')} description={t('common:placeholder.readyForNextPhase')} />
      <WidgetCard title={t('modules:widgets.financeSummary')} description={t('common:placeholder.readyForNextPhase')} />
    </section>
  );
}
