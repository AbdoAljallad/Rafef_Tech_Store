import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

type RadialMenuItemProps = {
  icon: LucideIcon;
  itemKey: string;
  path: string;
  angle: number;
  radius: number;
};

export function RadialMenuItem({ icon: Icon, itemKey, path, angle, radius }: RadialMenuItemProps) {
  const { t } = useTranslation('modules');
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return (
    <Link
      aria-label={t(`navigation.${itemKey}`)}
      className="module-circle"
      style={{ '--radial-x': `${x}px`, '--radial-y': `${y}px` } as CSSProperties}
      to={path}
    >
      <Icon size={25} aria-hidden="true" />
      <span>{t(`navigation.${itemKey}`)}</span>
    </Link>
  );
}
