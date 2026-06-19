import {
  ReportsRepository,
  type DashboardSectionKey,
  type DetailedReportPayload,
  type ReportFilters,
} from './reports.repository.js';
import type { UiLanguage } from '../../shared/localization/language.js';

export const REPORT_SECTION_PERMISSIONS: Record<DashboardSectionKey, string> = {
  sales: 'reports.sales.view',
  inventory: 'reports.inventory.view',
  finance: 'reports.finance.view',
  repair: 'reports.repair.view',
  projects: 'reports.projects.view',
  creative: 'reports.creative.view',
  customers: 'reports.customers.view',
  profit: 'reports.profit.view',
};

export const REPORT_SECTION_ORDER = Object.keys(REPORT_SECTION_PERMISSIONS) as DashboardSectionKey[];

export class ReportsService {
  constructor(private readonly repo = new ReportsRepository()) {}

  sales(filters: ReportFilters, language?: UiLanguage) { return this.repo.sales(filters, language); }
  inventory(filters: ReportFilters, language?: UiLanguage) { return this.repo.inventory(filters, language); }
  finance(filters: ReportFilters) { return this.repo.finance(filters); }
  repair(filters: ReportFilters, language?: UiLanguage) { return this.repo.repair(filters, language); }
  projects(filters: ReportFilters, language?: UiLanguage) { return this.repo.projects(filters, language); }
  creative(filters: ReportFilters, language?: UiLanguage) { return this.repo.creative(filters, language); }
  customers(filters: ReportFilters, language?: UiLanguage) { return this.repo.customers(filters, language); }
  profit(filters: ReportFilters, language?: UiLanguage) { return this.repo.profit(filters, language); }

  async dashboard(permissions: string[], filters: ReportFilters, language?: UiLanguage) {
    const availableSections = REPORT_SECTION_ORDER.filter((key) => permissions.includes(REPORT_SECTION_PERMISSIONS[key]));

    const sectionEntries = await Promise.all(
      availableSections.map(async (key) => {
        const payload = await this.section(key, filters, language);
        return [key, payload] as const;
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      filters,
      availableSections,
      sections: Object.fromEntries(sectionEntries) as Partial<Record<DashboardSectionKey, DetailedReportPayload>>,
    };
  }

  private section(key: DashboardSectionKey, filters: ReportFilters, language?: UiLanguage) {
    switch (key) {
      case 'sales':
        return this.sales(filters, language);
      case 'inventory':
        return this.inventory(filters, language);
      case 'finance':
        return this.finance(filters);
      case 'repair':
        return this.repair(filters, language);
      case 'projects':
        return this.projects(filters, language);
      case 'creative':
        return this.creative(filters, language);
      case 'customers':
        return this.customers(filters, language);
      case 'profit':
        return this.profit(filters, language);
      default:
        return Promise.resolve({ report: {} });
    }
  }
}
