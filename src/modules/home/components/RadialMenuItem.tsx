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
  index: number;
};

export function RadialMenuItem({ icon: Icon, itemKey, path, angle, radius, index }: RadialMenuItemProps) {
  const { t } = useTranslation('modules');
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const label = t(`navigation.${itemKey}`);

  return (
    <Link
      aria-label={label}
      className="module-circle"
      style={{ '--radial-x': `${x}px`, '--radial-y': `${y}px`, '--item-delay': `${index * 55}ms` } as CSSProperties}
      to={path}
    >
      <span className="module-circle-status" aria-hidden="true" />
      <span className="module-circle-icon">
        <Icon size={27} aria-hidden="true" />
      </span>
      <span className="module-circle-label">{label}</span>
    </Link>
  );
}
