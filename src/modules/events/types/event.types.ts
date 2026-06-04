export type TickerEvent = {
  id: number;
  messageRu: string;
  severity: 'normal' | 'important' | 'urgent' | 'critical';
  module: string;
  linkPath?: string | null;
  createdAt: string;
};

export type TickerEventsResponse = {
  items: TickerEvent[];
};
