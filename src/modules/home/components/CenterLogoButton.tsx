import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Command } from 'lucide-react';
import { logos } from '../../../shared/assets/logos';

export function CenterLogoButton() {
  const { t } = useTranslation('modules');
  const commandCenterLabel = t('navigation.commandCenter');

  return (
    <Link className="center-circle" to="/command-center" aria-label={commandCenterLabel}>
      <span className="center-circle-halo" aria-hidden="true" />
      <span className="center-circle-orbit" aria-hidden="true" />
      <span className="center-circle-logo-wrap">
        <img className="center-circle-logo" src={logos.rafefTech} alt="" />
      </span>
      <span className="center-circle-title">Rafef Tech</span>
      <span className="center-circle-subtitle">
        <Command size={14} aria-hidden="true" />
        <span>{commandCenterLabel}</span>
      </span>
      <span className="center-circle-action">
        <span>Открыть</span>
        <ArrowRight size={15} aria-hidden="true" />
      </span>
    </Link>
  );
}
