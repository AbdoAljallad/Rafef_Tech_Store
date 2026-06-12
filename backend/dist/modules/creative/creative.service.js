import { CreativeRepository } from './creative.repository.js';
import { nanoid } from 'nanoid';
export class CreativeService {
    repo = new CreativeRepository();
    async createJobType(payload) {
        return this.repo.createJobType({ code: payload.code, defaultName: payload.defaultName, createdBy: payload.createdBy ?? null });
    }
    async listJobTypes() {
        return this.repo.listJobTypes();
    }
    async createVendor(payload) {
        return this.repo.createVendor({ code: payload.code, name: payload.name, contact: payload.contact ?? null, createdBy: payload.createdBy ?? null });
    }
    async listVendors() {
        return this.repo.listVendors();
    }
    async createJob(payload) {
        const code = `CRJ-${Date.now()}-${nanoid(5)}`;
        return this.repo.createJob({
            jobCode: code,
            jobTypeId: payload.jobTypeId ?? null,
            customerId: payload.customerId ?? null,
            title: payload.title,
            description: payload.description ?? null,
            deadlineAt: payload.deadlineAt ?? null,
            createdBy: payload.createdBy ?? null,
        });
    }
    async listJobs() {
        return this.repo.listJobs();
    }
    async getJob(id) {
        return this.repo.getJob(id);
    }
    async addJobLine(payload) {
        return this.repo.addJobLine(payload);
    }
    async createVendorTask(payload) {
        return this.repo.createVendorTask(payload);
    }
    async changeJobStatus(jobId, fromStatus, toStatus, notes, changedBy) {
        return this.repo.changeJobStatus(jobId, fromStatus, toStatus, notes ?? null, changedBy ?? null);
    }
}
