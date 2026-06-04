import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api/events.api';

export function useTickerEvents() {
  return useQuery({
    queryKey: ['events', 'ticker'],
    queryFn: eventsApi.getTickerEvents,
    refetchInterval: 30_000,
    retry: 0,
  });
}
