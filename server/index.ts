import 'dotenv/config';
import express from 'express';
const app = express();
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', providersConfigured: false }));
const port = Number(process.env.PORT ?? 3001);
app.listen(port, '127.0.0.1', () => console.log(`Heist server listening on http://127.0.0.1:${port}`));
