import type { ReactNode } from 'react';

type WidgetCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function WidgetCard({ title, description, children }: WidgetCardProps) {
  return (
    <article className="widget-card">
      <header>
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </header>
      {children ? <div className="widget-card-body">{children}</div> : null}
    </article>
  );
}
