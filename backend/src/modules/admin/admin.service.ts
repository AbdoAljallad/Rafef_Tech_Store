import { AdminRepository } from './admin.repository.js';

export class AdminService {
  constructor(private readonly repo = new AdminRepository()) {}
  users() { return this.repo.users(); }
  roles() { return this.repo.roles(); }
  permissions() { return this.repo.permissions(); }
  settings() { return this.repo.settings(); }
}
