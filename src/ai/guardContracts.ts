import { z } from 'zod';
export const guardReactionSchema = z.object({
  reaction: z.enum(['neutral', 'suspicious', 'persuasive']),
  reason: z.string().trim().min(1).max(160),
}).strict();
export type GuardReaction = z.infer<typeof guardReactionSchema>;
export const guardContextSchema = z.object({
  suspicion: z.number().int().min(0).max(100),
  persuasion: z.number().int().min(0).max(3),
  keycardOwned: z.boolean(),
}).strict();
export type GuardContext = z.infer<typeof guardContextSchema>;
export const guardSessionRequestSchema = z.object({ requestId: z.string().uuid(), context: guardContextSchema }).strict();
export const guardDemoRequestSchema = z.object({
  requestId: z.string().uuid(), text: z.string().trim().min(1).max(500),
  history: z.array(z.string().max(500)).max(12), context: guardContextSchema,
}).strict();
export const guardDemoResponseSchema = z.object({
  requestId: z.string().uuid(), reply: z.string().max(240),
  assessment: guardReactionSchema, provider: z.literal('demo-guard'),
}).strict();
// Validates the documented private-agent join token; unknown future fields
// are retained because Fish instructs clients to pass the response unchanged.
export const guardSessionTokenSchema = z.object({
  session_id: z.string().min(1), expires_at: z.string().min(1),
  max_duration_seconds: z.number().int().positive(), transport: z.literal('livekit'),
  livekit_url: z.string().url(), token: z.string().min(1),
}).passthrough();
