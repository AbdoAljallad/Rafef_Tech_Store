import {
  BarChart3,
  BriefcaseBusiness,
  Camera,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  PackageSearch,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { MODULE_NAV_ITEMS } from '../../shared/permissions/routePermissions';

const iconMap: Record<string, LucideIcon> = {
  customers: Users,
  catalog: PackageSearch,
  inventory: ClipboardList,
  repair: Wrench,
  sales: ShoppingCart,
  finance: CircleDollarSign,
  creative: Camera,
  projects: FolderKanban,
  reports: BarChart3,
  settings: Settings,
  events: BriefcaseBusiness,
  integrations: BriefcaseBusiness,
};

export const HOME_MODULES = MODULE_NAV_ITEMS.filter((item) => item.key !== 'events' && item.key !== 'integrations').map(
  (item) => ({
    ...item,
    icon: iconMap[item.key] ?? BriefcaseBusiness,
  }),
);
