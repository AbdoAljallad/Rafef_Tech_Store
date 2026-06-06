import { Fragment, type CSSProperties } from 'react';
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
      <div className="home-orbital-field" aria-hidden="true">
        <span className="home-orbital-ring ring-one" />
        <span className="home-orbital-ring ring-two" />
        <span className="home-orbital-ring ring-three" />
      </div>

      <CenterLogoButton />

      <div className="module-circle-orbit" aria-hidden="true" />
      <div className="module-circle-layer">
        {HOME_MODULES.map((item, index) => {
          const angle = START_ANGLE + (FULL_CIRCLE / HOME_MODULES.length) * index;
          const x = Math.cos(angle) * RADIAL_RADIUS;
          const y = Math.sin(angle) * RADIAL_RADIUS;

          return (
            <PermissionGate permission={isOwnerAdmin ? undefined : item.permission} key={item.key}>
              <Fragment>
                <span
                  aria-hidden="true"
                  className="module-connector"
                  style={
                    {
                      '--connector-angle': `${angle}rad`,
                      '--connector-x': `${x}px`,
                      '--connector-y': `${y}px`,
                      '--item-delay': `${index * 55}ms`,
                    } as CSSProperties
                  }
                />
                <RadialMenuItem
                  angle={angle}
                  icon={item.icon}
                  index={index}
                  itemKey={item.key}
                  path={item.path}
                  radius={RADIAL_RADIUS}
                />
              </Fragment>
            </PermissionGate>
          );
        })}
      </div>
    </section>
  );
}
