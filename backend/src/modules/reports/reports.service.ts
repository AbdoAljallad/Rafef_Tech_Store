import {
  ReportsRepository,
  type DashboardSectionKey,
  type DetailedReportPayload,
  type ReportFilters,
} from './reports.repository.js';

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

  sales(filters: ReportFilters) { return this.repo.sales(filters); }
  inventory(filters: ReportFilters) { return this.repo.inventory(filters); }
  finance(filters: ReportFilters) { return this.repo.finance(filters); }
  repair(filters: ReportFilters) { return this.repo.repair(filters); }
  projects(filters: ReportFilters) { return this.repo.projects(filters); }
  creative(filters: ReportFilters) { return this.repo.creative(filters); }
  customers(filters: ReportFilters) { return this.repo.customers(filters); }
  profit(filters: ReportFilters) { return this.repo.profit(filters); }

  async dashboard(permissions: string[], filters: ReportFilters) {
    const availableSections = REPORT_SECTION_ORDER.filter((key) => permissions.includes(REPORT_SECTION_PERMISSIONS[key]));

    const sectionEntries = await Promise.all(
      availableSections.map(async (key) => {
        const payload = await this.section(key, filters);
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

  private section(key: DashboardSectionKey, filters: ReportFilters) {
    switch (key) {
      case 'sales':
        return this.sales(filters);
      case 'inventory':
        return this.inventory(filters);
      case 'finance':
        return this.finance(filters);
      case 'repair':
        return this.repair(filters);
      case 'projects':
        return this.projects(filters);
      case 'creative':
        return this.creative(filters);
      case 'customers':
        return this.customers(filters);
      case 'profit':
        return this.profit(filters);
      default:
        return Promise.resolve({ report: {} });
    }
  }
}

