import { httpClient } from '../../../shared/api/httpClient';

export type ReportName = 'sales' | 'inventory' | 'finance' | 'repair' | 'projects' | 'creative';

export const reportsApi = {
  get(name: ReportName) {
    return httpClient.get<{ report: Record<string, string | number | null> }>(`/api/reports/${name}`);
  },
};
