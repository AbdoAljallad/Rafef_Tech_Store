import { Link } from 'react-router-dom';
import type { TickerEvent } from '../../../modules/events/types/event.types';

type TickerItemProps = {
  event: TickerEvent;
};

export function TickerItem({ event }: TickerItemProps) {
  const content = (
    <>
      <span className={`ticker-dot ${event.severity}`} aria-hidden="true" />
      <span>{event.messageRu}</span>
    </>
  );

  if (event.linkPath) {
    return (
      <Link className="ticker-item" to={event.linkPath}>
        {content}
      </Link>
    );
  }

  return <span className="ticker-item">{content}</span>;
}
