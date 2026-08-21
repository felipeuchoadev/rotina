import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import { prisma } from './lib/db.js';

let io = null;
let appDirAtual = null;
const online = new Map();
const vistoPorUltimo = new Map();
const visualizando = new Map();

function viewKey(usuarioId, peerId) { return `${usuarioId}:${peerId}`; }
function addView(usuarioId, peerId, delta) {
  if (!usuarioId || !peerId) return;
  const key = viewKey(usuarioId, peerId);
  const n = Math.max(0, (visualizando.get(key) || 0) + delta);
  if (n) visualizando.set(key, n); else visualizando.delete(key);
}

// Observa o diretório do app e, quando o front muda (novo deploy), empurra 'app:update'
// pra TODOS os aparelhos conectados recarregarem na hora (autoupdate em ms, sem baixar nada).
let _lastDeploy = 0;
export function watchDeploys(appDir) {
  try {
    appDirAtual=appDir;
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
    // Se o servidor reiniciou depois do deploy, o fs.watch antigo pode ter perdido
    // a troca. Compara a versão do cliente ao conectar e atualiza só aquele aparelho.
    try{const sw=fs.readFileSync(appDirAtual+'/service-worker.js','utf8'),build=sw.match(/const CACHE = ['"]([^'"]+)/)?.[1];if(build&&socket.handshake.auth?.build!==build)setTimeout(()=>socket.emit('app:update',{build,at:Date.now()}),250);}catch{}
    (async()=>{ try{ const pendentes=await prisma.mensagem.findMany({where:{paraId:socket.userId,entregue:false},select:{id:true,deId:true}}); if(!pendentes.length)return; await prisma.mensagem.updateMany({where:{id:{in:pendentes.map(m=>m.id)}},data:{entregue:true}}); for(const m of pendentes)emitToUser(m.deId,'dm:entregue',{id:m.id}); }catch{} })();
    socket.on('presence:check',async(userId,cb)=>{ if(typeof cb!=='function') return; let lastSeen=vistoPorUltimo.get(userId)||null; if(!lastSeen){ try{ lastSeen=(await prisma.usuario.findUnique({where:{id:userId},select:{ultimoAcesso:true}}))?.ultimoAcesso||null; }catch{} } cb({online:!!online.get(userId),lastSeen}); });
    socket.on('dm:typing',(d)=>{ if(d&&d.paraId) io.to('user:'+d.paraId).emit('dm:typing',{deId:socket.userId,digitando:!!d.digitando}); });
    socket.on('dm:viewing',(d)=>{ const anterior=socket.data.dmPeerId; if(anterior)addView(socket.userId,anterior,-1); const peer=d?.peerId||null; socket.data.dmPeerId=peer; if(peer)addView(socket.userId,peer,1); });
    socket.on('dm:delivered',async(d)=>{ const id=Number(d?.id); if(!id)return; try{ const m=await prisma.mensagem.findFirst({where:{id,paraId:socket.userId},select:{deId:true,entregue:true}}); if(!m||m.entregue)return; await prisma.mensagem.update({where:{id},data:{entregue:true}}); emitToUser(m.deId,'dm:entregue',{id}); }catch{} });
    socket.on('disconnect',()=>{
      if(socket.data.dmPeerId)addView(socket.userId,socket.data.dmPeerId,-1);
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

export function isUserOnline(userId) { return !!online.get(userId); }
export function isViewingChat(userId, peerId) { return !!visualizando.get(viewKey(userId, peerId)); }

// Broadcast de eventos do feed pra todo mundo conectado
export function emitFeed(evento, dados) {
  if (io) io.to('feed').emit(evento, dados);
}
export function emitRanking() {
  if (io) io.to('feed').emit('ranking:mudou', {});
}
