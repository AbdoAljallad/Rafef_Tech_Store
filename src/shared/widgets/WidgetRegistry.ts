export const WIDGET_REGISTRY = [
  'today_activity',
  'notifications',
  'low_stock',
  'finance_summary',
  'repair_ready',
] as const;

export type WidgetKey = (typeof WIDGET_REGISTRY)[number];
