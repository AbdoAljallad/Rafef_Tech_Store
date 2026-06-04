import type { ReactNode } from 'react';

export type TabItem = {
  key: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  children?: ReactNode;
};

export function Tabs({ items, activeKey, onChange, children }: TabsProps) {
  return (
    <div className="ui-tabs">
      <div className="ui-tab-list" role="tablist">
        {items.map((item) => (
          <button
            className={item.key === activeKey ? 'ui-tab active' : 'ui-tab'}
            key={item.key}
            onClick={() => onChange(item.key)}
            role="tab"
            type="button"
            aria-selected={item.key === activeKey}
          >
            {item.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
