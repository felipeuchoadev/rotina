import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

export function initRealtime(httpServer, corsOrigins) {
  io = new Server(httpServer, { cors: { origin: corsOrigins, credentials: true } });

  // Autentica o socket pelo token (mesmo JWT da API)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('sem token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-inseguro-troque');
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('token inválido'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('feed'); // todos recebem eventos do feed/ranking ao vivo
  });

  return io;
}

// Broadcast de eventos do feed pra todo mundo conectado
export function emitFeed(evento, dados) {
  if (io) io.to('feed').emit(evento, dados);
}
export function emitRanking() {
  if (io) io.to('feed').emit('ranking:mudou', {});
}
