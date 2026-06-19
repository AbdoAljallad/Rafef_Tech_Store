import { httpClient } from '../../../shared/api/httpClient';

export type ReportName = 'sales' | 'inventory' | 'finance' | 'repair' | 'projects' | 'creative' | 'customers' | 'profit';
export type ReportMetricValue = string | number | null;
export type ReportRecord = Record<string, ReportMetricValue>;
export type ReportTableRow = Record<string, ReportMetricValue>;

export type DetailedReportPayload = {
  report: ReportRecord;
  [key: string]: ReportMetricValue | ReportRecord | ReportTableRow[] | undefined;
};

export type ReportsDashboardResponse = {
  generatedAt: string;
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
  };
  availableSections: ReportName[];
  sections: Partial<Record<ReportName, DetailedReportPayload>>;
};

export type ReportFilters = {
  dateFrom?: string | null;
  dateTo?: string | null;
};

function buildQueryString(filters: ReportFilters = {}) {
  const searchParams = new URLSearchParams();

  if (filters.dateFrom) {
    searchParams.set('dateFrom', filters.dateFrom);
  }

  if (filters.dateTo) {
    searchParams.set('dateTo', filters.dateTo);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const reportsApi = {
  get(name: ReportName, filters: ReportFilters = {}) {
    return httpClient.get<DetailedReportPayload>(`/api/reports/${name}${buildQueryString(filters)}`);
  },
  getDashboard(filters: ReportFilters = {}) {
    return httpClient.get<ReportsDashboardResponse>(`/api/reports/dashboard${buildQueryString(filters)}`);
  },
};

