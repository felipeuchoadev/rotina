import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { authRouter } from './routes/auth.js';
import { perfilRouter } from './routes/perfil.js';
import { stateRouter } from './routes/state.js';
import { batalhaRouter } from './routes/batalha.js';
import { dmRouter } from './routes/dm.js';
import { pushRouter } from './routes/push.js';
import { uploadRouter } from './routes/upload.js';
import { initRealtime } from './realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8090;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

app.set('trust proxy', 1); // atrás do Caddy/Nginx
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CORS_ORIGINS.length ? CORS_ORIGINS : true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Rate limit básico no login/cadastro (anti brute force)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });

// Mídia servida como estático (em produção o Caddy pode servir direto do disco)
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/api/saude', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/perfil', perfilRouter);
app.use('/api/state', stateRouter);
app.use('/api/batalha', batalhaRouter);
app.use('/api/dm', dmRouter);
app.use('/api/push', pushRouter);
app.use('/api/upload', uploadRouter);

// 404 e handler de erro
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno.' });
});

const server = http.createServer(app);
initRealtime(server, CORS_ORIGINS.length ? CORS_ORIGINS : true);

server.listen(PORT, () => {
  console.log(`DISCIPLINA API no ar em http://localhost:${PORT} (CORS: ${CORS_ORIGINS.join(', ') || '*'})`);
});
