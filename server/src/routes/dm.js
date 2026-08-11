import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { emitToUser } from '../realtime.js';
import { enviarPush } from '../lib/push.js';

export const dmRouter = Router();
dmRouter.use(exigirAuth);

const pub = { id: true, username: true, nomeGuerra: true, fotoUrl: true };

async function bloqueioEntre(a, b) {
  const n = await prisma.block.count({ where: { OR: [
    { usuarioId: a, bloqueadoId: b }, { usuarioId: b, bloqueadoId: a },
  ] } });
  return n > 0;
}

// Lista de conversas (última mensagem + não lidas por pessoa)
dmRouter.get('/conversas', async (req, res) => {
  const me = req.userId;
  const msgs = await prisma.mensagem.findMany({
    where: { OR: [{ deId: me }, { paraId: me }] },
    orderBy: { criadoEm: 'desc' }, take: 500,
    include: { de: { select: pub }, para: { select: pub } },
  });
  const map = new Map();
  for (const m of msgs) {
    const outro = m.deId === me ? m.para : m.de;
    if (!outro) continue;
    if (!map.has(outro.id)) map.set(outro.id, { usuario: outro, ultimo: { texto: m.texto, midiaTipo: m.midiaTipo, criadoEm: m.criadoEm, meu: m.deId === me }, naoLidas: 0 });
    if (m.paraId === me && !m.lida) map.get(outro.id).naoLidas++;
  }
  res.json([...map.values()]);
});

// Total de mensagens não lidas (badge)
dmRouter.get('/naolidas', async (req, res) => {
  const n = await prisma.mensagem.count({ where: { paraId: req.userId, lida: false } });
  res.json({ naoLidas: n });
});

// Conversa com um usuário (marca recebidas como lidas)
dmRouter.get('/:username', async (req, res) => {
  const outro = await prisma.usuario.findUnique({ where: { username: String(req.params.username).toLowerCase() }, select: pub });
  if (!outro) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (await bloqueioEntre(req.userId, outro.id)) return res.status(403).json({ erro: 'Conversa indisponível.' });
  const msgs = await prisma.mensagem.findMany({
    where: { OR: [
      { deId: req.userId, paraId: outro.id },
      { deId: outro.id, paraId: req.userId },
    ] },
    orderBy: { criadoEm: 'asc' }, take: 200,
  });
  const marcadas = await prisma.mensagem.updateMany({ where: { deId: outro.id, paraId: req.userId, lida: false }, data: { lida: true } });
  if (marcadas.count) emitToUser(outro.id, 'dm:lida', { por: req.userId });
  res.json({ usuario: outro, mensagens: msgs.map(m => ({ id: m.id, texto: m.texto, midiaUrl: m.midiaUrl, midiaTipo: m.midiaTipo, lida: m.deId===req.userId ? m.lida : true, criadoEm: m.criadoEm, meu: m.deId === req.userId })) });
});

// Enviar mensagem
dmRouter.post('/:username', async (req, res) => {
  const texto = String(req.body.texto || '').trim();
  const midiaUrl = req.body.midiaUrl ? String(req.body.midiaUrl) : null;
  const midiaTipo = req.body.midiaTipo ? String(req.body.midiaTipo) : null;
  if (!texto && !midiaUrl) return res.status(400).json({ erro: 'Mensagem vazia.' });
  const outro = await prisma.usuario.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!outro) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (outro.id === req.userId) return res.status(400).json({ erro: 'Não dá pra conversar com você mesmo.' });
  if (await bloqueioEntre(req.userId, outro.id)) return res.status(403).json({ erro: 'Conversa indisponível.' });
  const me = await prisma.usuario.findUnique({ where: { id: req.userId }, select: pub });
  const m = await prisma.mensagem.create({ data: { deId: req.userId, paraId: outro.id, texto, midiaUrl, midiaTipo } });
  const payload = { id: m.id, texto: m.texto, midiaUrl: m.midiaUrl, midiaTipo: m.midiaTipo, lida:false, criadoEm: m.criadoEm, de: me };
  emitToUser(outro.id, 'dm:nova', payload);
  enviarPush(outro.id, { title: 'Mensagem de ' + me.nomeGuerra, body: texto || (midiaTipo==='video'?'Enviou um vídeo':'Enviou uma foto'), tag: 'dm-'+me.username, url: '/rotina/#dm=' + encodeURIComponent(me.username) });
  res.status(201).json({ id: m.id, texto: m.texto, midiaUrl:m.midiaUrl, midiaTipo:m.midiaTipo, lida:false, criadoEm: m.criadoEm, meu: true });
});

export default dmRouter;
