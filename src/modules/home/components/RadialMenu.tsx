import { useTranslation } from 'react-i18next';
import { PermissionGate } from '../../../shared/permissions/PermissionGate';
import { useAuthStore } from '../../auth/stores/authStore';
import { HOME_MODULES } from '../homeModules';
import { CenterLogoButton } from './CenterLogoButton';
import { RadialMenuItem } from './RadialMenuItem';

const START_ANGLE = -Math.PI / 2;
const FULL_CIRCLE = Math.PI * 2;
const RADIAL_RADIUS = 265;

export function RadialMenu() {
  const { t } = useTranslation('modules');
  const roleCode = useAuthStore((state) => state.user?.role.code);
  const isOwnerAdmin = roleCode === 'OWNER_ADMIN';

  return (
    <section className="radial-home" aria-label={t('navigation.home')}>
      <CenterLogoButton />

      <div className="module-circle-orbit" aria-hidden="true" />
      <div className="module-circle-layer">
        {HOME_MODULES.map((item, index) => (
          <PermissionGate permission={isOwnerAdmin ? undefined : item.permission} key={item.key}>
            <RadialMenuItem
              angle={START_ANGLE + (FULL_CIRCLE / HOME_MODULES.length) * index}
              icon={item.icon}
              itemKey={item.key}
              path={item.path}
              radius={RADIAL_RADIUS}
            />
          </PermissionGate>
        ))}
      </div>
    </section>
  );
}
