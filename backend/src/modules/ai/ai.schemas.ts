import { z } from 'zod';

export const safeCommandSchema = z.object({
  command: z.enum(['status', 'explain', 'draft_report']),
  prompt: z.string().trim().max(2000).optional().nullable(),
  context: z.record(z.unknown()).optional().nullable(),
});

export type SafeCommandInput = z.infer<typeof safeCommandSchema>;
