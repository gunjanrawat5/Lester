import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { createGuardSession, demoGuardTurn } from './guard';
import { guardDemoRequestSchema, guardDemoResponseSchema, guardSessionRequestSchema } from '../src/ai/guardContracts';
import { commandRequestSchema } from '../src/ai/contracts';
import { interpretCommand } from './commands';
import { speak, transcribe, VoiceError, voiceConfiguration } from './fish';
export const app = express();
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ...voiceConfiguration() }));
app.post('/api/command', (req, res) => {
  const result = commandRequestSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: 'Send a request ID and a command of 1–500 characters.' }); return; }
  res.json(interpretCommand(result.data.requestId, result.data.text));
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 0 }, fileFilter: (_req, file, callback) => {
  if (/^(?:audio\/(?:webm|mp4|ogg|wav|x-wav|mpeg)|video\/webm)(?:;.*)?$/.test(file.mimetype)) callback(null, true);
  else callback(new VoiceError(415, 'Unsupported audio type. Use a supported browser recording.'));
} });
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file?.size) { res.status(400).json({ error: 'Record some audio first.' }); return; }
  res.setHeader('Cache-Control', 'no-store'); res.json(await transcribe(req.file));
});
app.post('/api/speak', async (req, res) => {
  const result = z.object({ text: z.string().trim().min(1).max(240), agent: z.enum(['bond', 'guard_1']) }).strict().safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: 'Send a short Bond or guard reply.' }); return; }
  res.setHeader('Cache-Control', 'no-store'); res.type('audio/mpeg').send(await speak(result.data.text, result.data.agent));
});
app.post('/api/guard/session', async (req, res) => {
  const parsed = guardSessionRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid guard session request.' }); return; }
  res.setHeader('Cache-Control', 'no-store'); res.json(await createGuardSession(parsed.data));
});
app.post('/api/guard/demo', (req, res) => {
  const parsed = guardDemoRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid guard dialogue request.' }); return; }
  const { requestId, text, history, context } = parsed.data;
  res.json(guardDemoResponseSchema.parse({ requestId, provider: 'demo-guard', ...demoGuardTurn(text, history, context) }));
});
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof VoiceError) { res.status(error.status).json({ error: error.message }); return; }
  if (error instanceof multer.MulterError) { res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'Send one recording under 4 MB.' }); return; }
  res.status(400).json({ error: 'Request could not be processed. Try again or use text.' });
});
const port = Number(process.env.PORT ?? 3001);
app.listen(port, '127.0.0.1', () => console.log(`Heist server listening on http://127.0.0.1:${port}`));
