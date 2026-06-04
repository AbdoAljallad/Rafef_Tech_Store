import { AdminRepository } from './admin.repository.js';
export class AdminService {
    repo;
    constructor(repo = new AdminRepository()) {
        this.repo = repo;
    }
    users() { return this.repo.users(); }
    roles() { return this.repo.roles(); }
    permissions() { return this.repo.permissions(); }
    settings() { return this.repo.settings(); }
}
