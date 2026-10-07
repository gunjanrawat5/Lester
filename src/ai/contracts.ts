import { z } from 'zod';
export const roomSchema = z.enum(['gallery', 'security', 'vault', 'entrance']);
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('MOVE'), agent: z.literal('bond'), target: roomSchema }).strict(),
  z.object({ type: z.literal('STOP'), agent: z.literal('bond') }).strict(),
  z.object({ type: z.literal('CONTINUE'), agent: z.literal('bond') }).strict(),
  z.object({ type: z.literal('HACK_CAMERA'), agent: z.literal('bond'), target: z.enum(['current','camera_1','camera_2','camera_3','camera_4','camera_5']) }).strict(),
  z.object({ type: z.literal('OPEN_VAULT'), agent: z.literal('bond') }).strict(),
  z.object({ type: z.literal('TAKE_RELIC'), agent: z.literal('bond') }).strict(),
]);
export type PreviewAction = z.infer<typeof actionSchema>;
export const commandRequestSchema = z.object({ requestId: z.string().uuid(), text: z.string().trim().min(1).max(500) }).strict();
export const commandResponseSchema = z.object({
  requestId: z.string().uuid(), mode: z.enum(['execute', 'query', 'clarify']),
  actions: z.array(actionSchema).max(1), reply: z.string().max(240),
  interpreter: z.literal('demo-parser'),
}).strict();
export type CommandResponse = z.infer<typeof commandResponseSchema>;
