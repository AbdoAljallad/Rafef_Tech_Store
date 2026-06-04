import { AuditService } from '../audit/audit.service.js';
export class AiAssistantService {
    audit;
    constructor(audit = new AuditService()) {
        this.audit = audit;
    }
    status(user) {
        return {
            assistant: 'ai_assistant',
            role: user.role.code,
            autonomousActions: false,
            directDatabaseAccess: false,
            allowedCommands: ['status', 'explain', 'draft_report'],
            boundaries: ['no_business_mutations', 'no_direct_db_access', 'audited_requests_only'],
        };
    }
    async safeCommand(input, user, ipAddress) {
        await this.audit.log({
            actorUserId: user.id,
            actionCode: 'ai.assistant.command.requested',
            module: 'integrations',
            entityType: 'ai_assistant',
            newValues: { command: input.command, context: input.context ?? null },
            ipAddress,
        });
        return {
            command: input.command,
            status: 'stub',
            autonomousActionTaken: false,
            requiresHumanExecution: true,
            result: input.command === 'status' ? this.status(user) : 'Command accepted as a non-executing stub.',
        };
    }
}
