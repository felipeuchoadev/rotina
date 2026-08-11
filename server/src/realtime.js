import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import { prisma } from './lib/db.js';

let io = null;
const online = new Map();
const vistoPorUltimo = new Map();

// Observa o diretório do app e, quando o front muda (novo deploy), empurra 'app:update'
// pra TODOS os aparelhos conectados recarregarem na hora (autoupdate em ms, sem baixar nada).
let _lastDeploy = 0;
export function watchDeploys(appDir) {
  try {
    fs.watch(appDir, (evt, file) => {
      if (file && file !== 'disciplina-v3.html' && file !== 'service-worker.js') return;
      const now = Date.now();
      if (now - _lastDeploy < 1500) return; // debounce (scp dispara vários eventos)
      _lastDeploy = now;
      setTimeout(() => { if (io) { io.to('feed').emit('app:update', { at: Date.now() }); console.log('[deploy] app:update enviado a todos os conectados'); } }, 500);
    });
    console.log('[deploy] observando mudanças em', appDir);
  } catch (e) { console.warn('[deploy] watch falhou:', e.message); }
}

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
    online.set(socket.userId,(online.get(socket.userId)||0)+1);
    io.to('feed').emit('presence:update',{userId:socket.userId,online:true});
    socket.on('presence:check',async(userId,cb)=>{ if(typeof cb!=='function') return; let lastSeen=vistoPorUltimo.get(userId)||null; if(!lastSeen){ try{ lastSeen=(await prisma.usuario.findUnique({where:{id:userId},select:{ultimoAcesso:true}}))?.ultimoAcesso||null; }catch{} } cb({online:!!online.get(userId),lastSeen}); });
    socket.on('dm:typing',(d)=>{ if(d&&d.paraId) io.to('user:'+d.paraId).emit('dm:typing',{deId:socket.userId,digitando:!!d.digitando}); });
    socket.on('disconnect',()=>{
      const n=Math.max(0,(online.get(socket.userId)||1)-1);
      if(n) online.set(socket.userId,n); else { online.delete(socket.userId); const at=new Date().toISOString(); vistoPorUltimo.set(socket.userId,at); prisma.usuario.update({where:{id:socket.userId},data:{ultimoAcesso:new Date(at)}}).catch(()=>{}); io.to('feed').emit('presence:update',{userId:socket.userId,online:false,lastSeen:at}); }
    });
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
