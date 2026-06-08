import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MODULE_NAV_ITEMS } from '../../permissions/routePermissions';
import { usePermission } from '../../permissions/usePermission';

function ModuleNavLink({ item }: { item: (typeof MODULE_NAV_ITEMS)[number] }) {
  const { t } = useTranslation('modules');
  const isAllowed = usePermission(item.permission);

  if (!isAllowed) {
    return null;
  }

  return (
    <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to={item.path}>
      <span className="nav-link-indicator" aria-hidden="true" />
      <span>{t(`navigation.${item.key}`)}</span>
    </NavLink>
  );
}

export function ModuleNav() {
  const { t } = useTranslation('navigation');

  return (
    <nav className="module-nav" aria-label={t('main.ariaLabel')}>
      <span className="module-nav-title">Навигация</span>
      {MODULE_NAV_ITEMS.map((item) => (
        <ModuleNavLink key={item.key} item={item} />
      ))}
    </nav>
  );
}
