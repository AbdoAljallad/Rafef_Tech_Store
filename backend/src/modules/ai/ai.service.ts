import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { SafeCommandInput } from './ai.schemas.js';

export class AiAssistantService {
  constructor(private readonly audit = new AuditService()) {}

  status(user: AuthenticatedUser) {
    return {
      assistant: 'ai_assistant',
      role: user.role.code,
      autonomousActions: false,
      directDatabaseAccess: false,
      allowedCommands: ['status', 'explain', 'draft_report'],
      boundaries: ['no_business_mutations', 'no_direct_db_access', 'audited_requests_only'],
    };
  }

  async safeCommand(input: SafeCommandInput, user: AuthenticatedUser, ipAddress?: string | null) {
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
