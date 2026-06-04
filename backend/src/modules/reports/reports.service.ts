import { ReportsRepository } from './reports.repository.js';

export class ReportsService {
  constructor(private readonly repo = new ReportsRepository()) {}

  sales() { return this.repo.sales(); }
  inventory() { return this.repo.inventory(); }
  finance() { return this.repo.finance(); }
  repair() { return this.repo.repair(); }
  projects() { return this.repo.projects(); }
  creative() { return this.repo.creative(); }
}
