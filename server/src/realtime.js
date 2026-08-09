import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

export function initRealtime(httpServer, corsOrigins) {
  // path casa com o proxy do nginx: /rotina/socket.io/
  io = new Server(httpServer, {
    path: process.env.SOCKET_PATH || '/rotina/socket.io',
    cors: { origin: corsOrigins, credentials: true },
  });

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
    if (socket.userId) socket.join('user:' + socket.userId); // sala pessoal (DM/notificações)
  });

  return io;
}

// Envia um evento só pra um usuário específico (DM, notificação pessoal)
export function emitToUser(userId, evento, dados) {
  if (io && userId) io.to('user:' + userId).emit(evento, dados);
}

// Broadcast de eventos do feed pra todo mundo conectado
export function emitFeed(evento, dados) {
  if (io) io.to('feed').emit(evento, dados);
}
export function emitRanking() {
  if (io) io.to('feed').emit('ranking:mudou', {});
}
