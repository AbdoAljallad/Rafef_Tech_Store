import { AppError } from '../../shared/errors/AppError.js';
import { AuditService } from '../audit/audit.service.js';
import { EventService } from '../events/event.service.js';
import { StockReservationService } from '../inventory/stockReservation.service.js';
import { ProjectsRepository } from './projects.repository.js';
export class ProjectsService {
    repo;
    audit;
    events;
    reservations;
    constructor(repo = new ProjectsRepository(), audit = new AuditService(), events = new EventService(), reservations = new StockReservationService()) {
        this.repo = repo;
        this.audit = audit;
        this.events = events;
        this.reservations = reservations;
    }
    listTypes() { return this.repo.listTypes(); }
    createType(input, userId) { return this.repo.createType(input, userId); }
    listProjects(params) { return this.repo.listProjects(params); }
    async createProject(input, userId, ip) {
        const project = await this.repo.createProject(input, userId);
        const projectId = Number(project.id);
        await this.audit.log({ actorUserId: userId, actionCode: 'project.created', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
        await this.events.create({ module: 'projects', eventType: 'project.created', title: 'Project created', entityType: 'projects', entityId: projectId, actorUserId: userId });
        return project;
    }
    async getProject(id) {
        const project = await this.repo.findProject(id);
        if (!project)
            throw new AppError(404, 'NOT_FOUND', 'Project not found');
        return project;
    }
    getProjectBilling(id) {
        return this.repo.getProjectBilling(id);
    }
    async addSite(projectId, input, userId, ip) {
        const site = await this.repo.addSite(projectId, input, userId);
        await this.audit.log({ actorUserId: userId, actionCode: 'project.site.added', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
        return site;
    }
    async changeStatus(projectId, input, userId, ip) {
        const project = await this.repo.changeStatus(projectId, input, userId);
        await this.audit.log({ actorUserId: userId, actionCode: 'project.status.changed', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
        await this.events.create({ module: 'projects', eventType: 'project.status_changed', title: 'Project status changed', entityType: 'projects', entityId: projectId, actorUserId: userId });
        return project;
    }
    async addMaterial(projectId, input, userId, ip) {
        await this.repo.requireProject(projectId);
        await this.repo.requireProduct(input.productId);
        const reservation = await this.reservations.createReservation({ productId: input.productId, quantity: input.quantity, sourceType: 'project', sourceId: projectId, notes: input.notes ?? 'Project material reservation' }, userId, ip);
        const material = await this.repo.addMaterial(projectId, input, Number(reservation.id), userId);
        await this.audit.log({ actorUserId: userId, actionCode: 'project.material.reserved', module: 'projects', entityType: 'projects', entityId: projectId, newValues: material, ipAddress: ip });
        return material;
    }
    async addInstalledAsset(projectId, input, userId, ip) {
        const asset = await this.repo.addInstalledAsset(projectId, input, userId);
        await this.audit.log({ actorUserId: userId, actionCode: 'project.asset.installed', module: 'projects', entityType: 'projects', entityId: projectId, newValues: input, ipAddress: ip });
        return asset;
    }
    addNote(projectId, input, userId) {
        return this.repo.addNote(projectId, input, userId);
    }
    summary(projectId) {
        return this.repo.summary(projectId);
    }
}
