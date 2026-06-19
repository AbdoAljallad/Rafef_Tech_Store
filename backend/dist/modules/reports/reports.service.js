import { ReportsRepository, } from './reports.repository.js';
export const REPORT_SECTION_PERMISSIONS = {
    sales: 'reports.sales.view',
    inventory: 'reports.inventory.view',
    finance: 'reports.finance.view',
    repair: 'reports.repair.view',
    projects: 'reports.projects.view',
    creative: 'reports.creative.view',
    customers: 'reports.customers.view',
    profit: 'reports.profit.view',
};
export const REPORT_SECTION_ORDER = Object.keys(REPORT_SECTION_PERMISSIONS);
export class ReportsService {
    repo;
    constructor(repo = new ReportsRepository()) {
        this.repo = repo;
    }
    sales(filters, language) { return this.repo.sales(filters, language); }
    inventory(filters, language) { return this.repo.inventory(filters, language); }
    finance(filters) { return this.repo.finance(filters); }
    repair(filters, language) { return this.repo.repair(filters, language); }
    projects(filters, language) { return this.repo.projects(filters, language); }
    creative(filters, language) { return this.repo.creative(filters, language); }
    customers(filters, language) { return this.repo.customers(filters, language); }
    profit(filters, language) { return this.repo.profit(filters, language); }
    async dashboard(permissions, filters, language) {
        const availableSections = REPORT_SECTION_ORDER.filter((key) => permissions.includes(REPORT_SECTION_PERMISSIONS[key]));
        const sectionEntries = await Promise.all(availableSections.map(async (key) => {
            const payload = await this.section(key, filters, language);
            return [key, payload];
        }));
        return {
            generatedAt: new Date().toISOString(),
            filters,
            availableSections,
            sections: Object.fromEntries(sectionEntries),
        };
    }
    section(key, filters, language) {
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
