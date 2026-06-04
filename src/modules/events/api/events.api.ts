import { API_ENDPOINTS } from '../../../shared/api/endpoints';
import { httpClient } from '../../../shared/api/httpClient';
import type { TickerEventsResponse } from '../types/event.types';

export const eventsApi = {
  getTickerEvents() {
    return httpClient.get<TickerEventsResponse>(API_ENDPOINTS.events.ticker);
  },

  markRead(id: number | string) {
    return httpClient.post<void>(API_ENDPOINTS.events.markRead(id));
  },
};
