import { ReportsRepository } from './reports.repository.js';
export class ReportsService {
    repo;
    constructor(repo = new ReportsRepository()) {
        this.repo = repo;
    }
    sales() { return this.repo.sales(); }
    inventory() { return this.repo.inventory(); }
    finance() { return this.repo.finance(); }
    repair() { return this.repo.repair(); }
    projects() { return this.repo.projects(); }
    creative() { return this.repo.creative(); }
}
