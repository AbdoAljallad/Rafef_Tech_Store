import { useTranslation } from 'react-i18next';
import { Badge } from '../../ui/Badge';

type StatusBadgeProps = {
  domain: string;
  status: string;
};

export function StatusBadge({ domain, status }: StatusBadgeProps) {
  const { t } = useTranslation('statuses');

  return <Badge tone="info">{t(`${domain}.${status}`, { defaultValue: status })}</Badge>;
}
