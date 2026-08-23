import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { emitToUser, isUserOnline, isViewingChat } from '../realtime.js';
import { enviarPush } from '../lib/push.js';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

export const dmRouter = Router();
dmRouter.use(exigirAuth);

const pub = { id: true, username: true, nomeGuerra: true, fotoUrl: true, genero: true };
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

async function apagarMidiaLocal(url) {
  if (!url) return;
  try {
    const pathname = new URL(String(url), 'https://redzone.local').pathname;
    if (!pathname.startsWith('/uploads/')) return;
    const nome = path.basename(pathname);
    if (!nome || nome === '.' || nome === '..') return;
    await unlink(path.resolve(UPLOAD_DIR, nome));
  } catch (e) { if (e?.code !== 'ENOENT') console.warn('Falha ao apagar mídia de DM:', e.message); }
}

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
    where: { OR: [{ deId: me, apagadaDe: false }, { paraId: me, apagadaPara: false }] },
    orderBy: { criadoEm: 'desc' }, take: 500,
    include: { de: { select: pub }, para: { select: pub } },
  });
  const map = new Map();
  for (const m of msgs) {
    const outro = m.deId === me ? m.para : m.de;
    if (!outro) continue;
    if (!map.has(outro.id)) map.set(outro.id, { usuario: outro, ultimo: { texto: m.apagadaTodos ? 'Mensagem apagada' : m.texto, midiaTipo: m.apagadaTodos ? null : m.midiaTipo, criadoEm: m.criadoEm, meu: m.deId === me }, naoLidas: 0 });
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
      { deId: req.userId, paraId: outro.id, apagadaDe: false },
      { deId: outro.id, paraId: req.userId, apagadaPara: false },
    ] },
    orderBy: { criadoEm: 'asc' }, take: 200,
  });
  const marcadas = await prisma.mensagem.updateMany({ where: { deId: outro.id, paraId: req.userId, lida: false }, data: { entregue: true, lida: true } });
  if (marcadas.count) emitToUser(outro.id, 'dm:lida', { por: req.userId });
  res.json({ usuario: outro, mensagens: msgs.map(m => ({ id: m.id, texto: m.texto, midiaUrl: m.midiaUrl, midiaTipo: m.midiaTipo, apagadaTodos:m.apagadaTodos, respostaAId:m.respostaAId, respostaTexto:m.respostaTexto, respostaTipo:m.respostaTipo, respostaMeu:m.respostaMeu == null ? null : (m.deId===req.userId ? m.respostaMeu : !m.respostaMeu), reacoes:m.reacoes||{}, entregue: m.deId===req.userId ? m.entregue : true, lida: m.deId===req.userId ? m.lida : true, criadoEm: m.criadoEm, meu: m.deId === req.userId })) });
});

// Encaminha um lote para outra conversa, mantendo texto e mídia originais.
dmRouter.post('/encaminhar', async (req, res) => {
  const username = String(req.body.paraUsername || '').toLowerCase();
  const ids = [...new Set((Array.isArray(req.body.mensagens) ? req.body.mensagens : []).map(Number).filter(Number.isInteger))].slice(0, 30);
  if (!username || !ids.length) return res.status(400).json({ erro: 'Escolha mensagens e um destinatário.' });
  const outro = await prisma.usuario.findUnique({ where: { username }, select: pub });
  if (!outro) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (outro.id === req.userId || await bloqueioEntre(req.userId, outro.id)) return res.status(403).json({ erro: 'Não é possível encaminhar para este usuário.' });
  const originais = await prisma.mensagem.findMany({ where: { id: { in: ids }, apagadaTodos:false, OR:[{deId:req.userId},{paraId:req.userId}] }, orderBy:{criadoEm:'asc'} });
  if (!originais.length) return res.status(404).json({ erro: 'Mensagens não encontradas.' });
  const entregue = isUserOnline(outro.id), me = await prisma.usuario.findUnique({ where:{id:req.userId}, select:pub });
  const criadas = [];
  for (const original of originais) criadas.push(await prisma.mensagem.create({ data:{ deId:req.userId, paraId:outro.id, texto:original.texto, midiaUrl:original.midiaUrl, midiaTipo:original.midiaTipo, entregue } }));
  for (const m of criadas) emitToUser(outro.id,'dm:nova',{id:m.id,texto:m.texto,midiaUrl:m.midiaUrl,midiaTipo:m.midiaTipo,reacoes:{},entregue,lida:false,criadoEm:m.criadoEm,de:me});
  if (!isViewingChat(outro.id, req.userId)) enviarPush(outro.id,{title:'Mensagem de '+me.nomeGuerra,body:criadas.length>1?`${criadas.length} mensagens encaminhadas`:(criadas[0].texto||'Mídia encaminhada'),tag:'dm-'+me.username,url:'/rotina/#dm='+encodeURIComponent(me.username)});
  res.status(201).json({ok:true,quantidade:criadas.length});
});

// Enviar mensagem
dmRouter.post('/:username', async (req, res) => {
  const texto = String(req.body.texto || '').trim();
  const midiaUrl = req.body.midiaUrl ? String(req.body.midiaUrl) : null;
  const midiaTipo = req.body.midiaTipo ? String(req.body.midiaTipo) : null;
  const respostaAId = Number(req.body.respostaAId) || null;
  if (!texto && !midiaUrl) return res.status(400).json({ erro: 'Mensagem vazia.' });
  const outro = await prisma.usuario.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!outro) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (outro.id === req.userId) return res.status(400).json({ erro: 'Não dá pra conversar com você mesmo.' });
  if (await bloqueioEntre(req.userId, outro.id)) return res.status(403).json({ erro: 'Conversa indisponível.' });
  const me = await prisma.usuario.findUnique({ where: { id: req.userId }, select: pub });
  let resposta = null;
  if (respostaAId) resposta = await prisma.mensagem.findFirst({ where: { id: respostaAId, OR: [
    { deId:req.userId, paraId:outro.id }, { deId:outro.id, paraId:req.userId },
  ] } });
  const entregue = isUserOnline(outro.id);
  const respostaTexto = resposta ? (resposta.apagadaTodos ? 'Mensagem apagada' : resposta.texto || (resposta.midiaTipo==='audio'?'Áudio':resposta.midiaTipo==='video'?'Vídeo':'Foto')) : null;
  const m = await prisma.mensagem.create({ data: { deId: req.userId, paraId: outro.id, texto, midiaUrl, midiaTipo, entregue, respostaAId:resposta?.id||null, respostaTexto, respostaTipo:resposta?.midiaTipo||null, respostaMeu:resposta ? resposta.deId===req.userId : null } });
  const respostaPayload={ respostaAId:m.respostaAId, respostaTexto:m.respostaTexto, respostaTipo:m.respostaTipo, respostaMeu:m.respostaMeu };
  const payload = { id: m.id, texto: m.texto, midiaUrl: m.midiaUrl, midiaTipo: m.midiaTipo, ...respostaPayload, respostaMeu:m.respostaMeu == null ? null : !m.respostaMeu, entregue, lida:false, criadoEm: m.criadoEm, de: me };
  emitToUser(outro.id, 'dm:nova', payload);
  const descricaoMidia = midiaTipo==='video'?'Enviou um vídeo':midiaTipo==='audio'?'Enviou um áudio':'Enviou uma foto';
  if (!isViewingChat(outro.id, req.userId)) enviarPush(outro.id, { title: 'Mensagem de ' + me.nomeGuerra, body: texto || descricaoMidia, tag: 'dm-'+me.username, url: '/rotina/#dm=' + encodeURIComponent(me.username) });
  res.status(201).json({ id: m.id, texto: m.texto, midiaUrl:m.midiaUrl, midiaTipo:m.midiaTipo, ...respostaPayload, reacoes:{}, entregue, lida:false, criadoEm: m.criadoEm, meu: true });
});

dmRouter.post('/mensagem/:id/reacao', async (req, res) => {
  const id=Number(req.params.id), emoji=String(req.body.emoji||'').trim();
  if (!Number.isInteger(id) || !emoji || emoji.length>16) return res.status(400).json({erro:'Reação inválida.'});
  const m=await prisma.mensagem.findUnique({where:{id}});
  if(!m || m.apagadaTodos || (m.deId!==req.userId&&m.paraId!==req.userId)) return res.status(404).json({erro:'Mensagem não encontrada.'});
  const reacoes=m.reacoes&&typeof m.reacoes==='object'&&!Array.isArray(m.reacoes)?{...m.reacoes}:{};
  for(const [e,usuarios] of Object.entries(reacoes)){if(!Array.isArray(usuarios))delete reacoes[e];else{reacoes[e]=usuarios.filter(x=>x!==req.userId);if(!reacoes[e].length)delete reacoes[e];}}
  const ja=(Array.isArray(m.reacoes?.[emoji])&&m.reacoes[emoji].includes(req.userId));
  if(!ja)reacoes[emoji]=[...(reacoes[emoji]||[]),req.userId];
  await prisma.mensagem.update({where:{id},data:{reacoes}});
  const payload={id,reacoes};emitToUser(m.deId,'dm:reacao',payload);emitToUser(m.paraId,'dm:reacao',payload);
  res.json(payload);
});

// Apaga somente da própria visualização ou, para o remetente, de todos os aparelhos.
dmRouter.delete('/mensagem/:id', async (req, res) => {
  const id = Number(req.params.id), modo = req.query.modo === 'todos' ? 'todos' : 'mim';
  if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Mensagem inválida.' });
  const m = await prisma.mensagem.findUnique({ where: { id }, include: { de: { select: pub }, para: { select: pub } } });
  if (!m || (m.deId !== req.userId && m.paraId !== req.userId)) return res.status(404).json({ erro: 'Mensagem não encontrada.' });
  if (modo === 'todos') {
    if (m.deId !== req.userId) return res.status(403).json({ erro: 'Só quem enviou pode apagar para todos.' });
    await prisma.mensagem.update({ where: { id }, data: { texto: '', midiaUrl: null, midiaTipo: null, apagadaTodos: true, entregue: true, lida: true } });
    await apagarMidiaLocal(m.midiaUrl);
    const payload = { id, modo: 'todos', tag: 'dm-' + m.de.username };
    emitToUser(m.deId, 'dm:apagada', payload); emitToUser(m.paraId, 'dm:apagada', payload);
    return res.json({ ok: true, modo: 'todos' });
  }
  const data = m.deId === req.userId ? { apagadaDe: true } : { apagadaPara: true };
  const atualizada = await prisma.mensagem.update({ where: { id }, data });
  if (atualizada.apagadaDe && atualizada.apagadaPara) { await prisma.mensagem.delete({ where: { id } }); await apagarMidiaLocal(m.midiaUrl); }
  emitToUser(req.userId, 'dm:apagada', { id, modo: 'mim' });
  res.json({ ok: true, modo: 'mim' });
});

export default dmRouter;
