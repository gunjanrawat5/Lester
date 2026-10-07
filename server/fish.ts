import { z } from 'zod';
export class VoiceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function voiceConfiguration() {
  return { fishSTT: Boolean(process.env.FISH_API_KEY?.trim()), fishTTS: Boolean(process.env.FISH_API_KEY?.trim() && process.env.FISH_BOND_VOICE_ID?.trim()), guardAgent: true, guardTTS: Boolean(process.env.FISH_API_KEY?.trim() && process.env.FISH_GUARD_VOICE_ID?.trim()), interpreter: 'fish-agent', bondAgent: true };
}
export async function fishRequest(path: string, body: BodyInit, headers: Record<string, string>) {
  const key = process.env.FISH_API_KEY?.trim();
  if (!key) throw new VoiceError(503, 'Fish Audio is not configured. Add FISH_API_KEY to .env and restart the server, or use Browser demo.');
  let response: Response;
  try {
    response = await fetch(`https://api.fish.audio${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, ...headers }, body, signal: AbortSignal.timeout(15000) });
  } catch {
    throw new VoiceError(504, 'Voice service timed out or could not be reached. Your text commands are still available.');
  }
  if (!response.ok) {
    const messages: Record<number, string> = { 400: path === '/v1/agent/sessions' ? 'Fish Audio rejected the guard setup. Check the agent and enable voice_id overrides if setting a guard voice.' : 'Fish Audio could not process this recording. Try a longer, clearer command.', 401: 'Fish Audio rejected the API key. Check FISH_API_KEY.', 402: 'Fish Audio API credit is required.', 413: 'Recording is too large. Keep commands under 15 seconds.', 429: 'Fish Audio is busy. Try again shortly.' };
    // Provider bodies can contain service details; expose only controlled messages.
    await response.body?.cancel();
    throw new VoiceError(response.status < 500 ? response.status : 502, messages[response.status] ?? 'Fish Audio is temporarily unavailable. Try again or use text.');
  }
  return response;
}
export async function transcribe(file: Express.Multer.File) {
  const form = new FormData();
  const extension = file.mimetype.includes('mp4') ? 'mp4' : file.mimetype.includes('ogg') ? 'ogg' : file.mimetype.includes('wav') ? 'wav' : 'webm';
  form.append('audio', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), `command.${extension}`);
  form.append('language', 'en'); form.append('ignore_timestamps', 'true'); form.append('tag_audio_events', 'false');
  const response = await fishRequest('/v1/asr', form, { model: 'transcribe-1-pro' });
  try {
    const result = z.object({ text: z.string().max(10000) }).parse(await response.json());
    const text = result.text.replace(/<\|speaker:\d+\|>/g, '').trim();
    if (text.length > 500) throw new VoiceError(422, 'That transcript is too long. Try a shorter command.');
    return { text, provider: 'fish-audio' };
  } catch (error) {
    if (error instanceof VoiceError) throw error;
    throw new VoiceError(502, 'Fish Audio returned an unreadable transcript. Try again or use text.');
  }
}
export async function speak(text: string, agent: 'bond' | 'guard_1' = 'bond') {
  const variable = agent === 'bond' ? 'FISH_BOND_VOICE_ID' : 'FISH_GUARD_VOICE_ID';
  const voice = process.env[variable]?.trim();
  if (!voice) throw new VoiceError(503, `Set ${variable} to enable Fish Audio replies.`);
  const response = await fishRequest('/v1/tts', JSON.stringify({ text, reference_id: voice, format: 'mp3', latency: 'balanced' }), { 'Content-Type': 'application/json', model: 's2.1-pro-free' });
  try { return Buffer.from(await response.arrayBuffer()); }
  catch { throw new VoiceError(502, 'Speech audio could not be downloaded.'); }
}
