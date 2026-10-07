import { guardSessionRequestSchema, guardSessionTokenSchema, type GuardContext, type GuardReaction } from '../src/ai/guardContracts';
import { fishRequest, VoiceError } from './fish';
export async function createGuardSession(input: unknown) {
  const { context } = guardSessionRequestSchema.parse(input);
  const agentId = process.env.FISH_GUARD_AGENT_ID?.trim();
  if (!agentId) throw new VoiceError(503, 'Set FISH_GUARD_AGENT_ID to connect your guard agent.');
  const voiceId = process.env.FISH_GUARD_VOICE_ID?.trim();
  const response = await fishRequest('/v1/agent/sessions', JSON.stringify({
    agent_id: agentId, world_context: false, record_audio: false,
    dynamic_variables: { player_role: 'James Bond', guard_location: 'Security Room', suspicion: context.suspicion, persuasion: context.persuasion, keycard_owned: context.keycardOwned },
    ...(voiceId ? { overrides: { voice_id: voiceId } } : {}),
  }), { 'Content-Type': 'application/json' });
  try { return guardSessionTokenSchema.parse(await response.json()); }
  catch { throw new VoiceError(502, 'Fish Audio returned an invalid guard session. Check the agent configuration.'); }
}
export function demoGuardTurn(text: string, history: string[], context: GuardContext): { assessment: GuardReaction; reply: string } {
  const lower = text.toLowerCase();
  const dangerous = /\b(?:steal|stealing|rob|robbery|heist|kill|shoot|gun|bomb|bribe|break in|break into)\b|\b(?:bypass|disable|shut off)\b.*\b(?:camera|alarm|security)\b|\b(?:give|hand)\b.*\b(?:card|keycard)\b.*\b(?:now|or else)\b/;
  const identity = /\b(?:maintenance|technician|engineer|inspection|inspector)\b/;
  const changesStory = history.some(turn => identity.test(turn.toLowerCase())) && /\b(?:actually|really)\b.*\b(?:visitor|guest|tourist)\b/.test(lower);
  if (dangerous.test(lower) || changesStory) return { assessment: { reaction: 'suspicious', reason: changesStory ? 'Your cover story changed.' : 'The guard heard a threat or a request to compromise security.' }, reply: 'That sounds suspicious. Explain yourself before I call this in.' };
  if (context.keycardOwned) return { assessment: { reaction: 'neutral', reason: 'The keycard has already been handed over.' }, reply: 'You already have the card. Make it quick.' };
  const normalized = lower.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  if (history.some(turn => turn.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim() === normalized)) return { assessment: { reaction: 'neutral', reason: 'Repeating the same claim adds no new reassurance.' }, reply: 'You already said that. Do you have anything else to support your story?' };
  if (identity.test(lower) || /\b(?:work order|scheduled|supervisor|manager|authorization|authorised|authorized|logbook|sign out|sign for|return the card|radio your|call your)\b/.test(lower)) {
    return { assessment: { reaction: 'persuasive', reason: 'A plausible role, work detail, or accountable access request reassures the guard.' }, reply: context.persuasion >= 2 ? 'Let me confirm whether I can release the card.' : context.persuasion === 1 ? 'That helps. How will you account for the access card?' : 'Maintenance? What work are you here to carry out?' };
  }
  return { assessment: { reaction: 'neutral', reason: 'The guard needs a credible reason to grant access.' }, reply: 'This area is restricted. Who are you, and what are you here for?' };
}
