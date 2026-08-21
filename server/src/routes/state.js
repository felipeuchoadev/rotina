import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { exigirAuth } from '../lib/auth.js';
import { emitToUser, emitRanking } from '../realtime.js';

// Armazenamento chave-valor por usuário (dados pessoais do app).
export const stateRouter = Router();
stateRouter.use(exigirAuth);

function mergeRotinaDias(atual, recebido) {
  if (!atual || typeof atual !== 'object' || !recebido || typeof recebido !== 'object') return recebido;
  const out = { ...recebido };
  for (const [iso, listaNova] of Object.entries(recebido)) {
    if (!Array.isArray(listaNova)) continue;
    const antigos = new Map((Array.isArray(atual[iso]) ? atual[iso] : []).map(a => [a.id, a]));
    out[iso] = listaNova.map(novo => {
      const velho = antigos.get(novo.id);
      return velho && Number(velho.updatedAt || 0) > Number(novo.updatedAt || 0) ? velho : novo;
    });
  }
  return out;
}

async function recalcularXp(usuarioId) {
  const rows = await prisma.userState.findMany({
    where: { usuarioId, chave: { in: ['treino:logs', 'estudo:logs', 'alim:agua', 'xp:bonus'] } },
  });
  const s = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
  const hoje = new Date().toISOString().slice(0, 10);
  const dataLegitima = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && value <= hoje;
  const minutosLegitimos = value => {
    const ms = Number(value);
    return Number.isFinite(ms) && ms >= 60_000 && ms <= 86_400_000 ? Math.floor(ms / 60_000) : 0;
  };
  let xp = 0;
  for (const log of Array.isArray(s['treino:logs']) ? s['treino:logs'] : []) {
    if (dataLegitima(log?.dateISO)) xp += minutosLegitimos(log?.ativoMs);
  }
  for (const log of Array.isArray(s['estudo:logs']) ? s['estudo:logs'] : []) {
    const minutos = dataLegitima(log?.dateISO) ? minutosLegitimos(log?.ativoMs) : 0;
    if (!minutos) continue;
    xp += minutos * 2;
    xp += new Set((Array.isArray(log.conteudos) ? log.conteudos : []).filter(Boolean)).size * 40;
  }
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { metaAgua: true } });
  const metaAgua = Math.max(250, Number(usuario?.metaAgua || 2500));
  const agua = s['alim:agua'] && typeof s['alim:agua'] === 'object' && !Array.isArray(s['alim:agua']) ? s['alim:agua'] : {};
  for (const [dia, valor] of Object.entries(agua)) {
    const ml = Number(valor);
    if (dataLegitima(dia) && Number.isFinite(ml) && ml >= metaAgua && ml <= 20_000) xp += 15;
  }
  const bonus = Number(s['xp:bonus']);
  // Ajustes administrativos podem ser positivos ou negativos; o usuário não
  // consegue editar esta chave pelas rotas públicas.
  if (Number.isFinite(bonus)) xp += Math.floor(bonus);
  const xpFinal = Math.max(0, Math.floor(xp));
  await prisma.usuario.update({ where: { id: usuarioId }, data: { xp: xpFinal } });
  emitToUser(usuarioId, 'profile:changed', { usuario: { xp: xpFinal }, src: null });
  emitRanking();
  return xpFinal;
}

// Todos os blobs do usuário de uma vez → { chave: valor, ... }
stateRouter.get('/', async (req, res) => {
  const rows = await prisma.userState.findMany({ where: { usuarioId: req.userId } });
  const out = {};
  for (const r of rows) out[r.chave] = r.valor;
  res.json(out);
});

stateRouter.get('/historico/lista', async (req,res)=>{
  const chaves=String(req.query.chaves||'').split(',').map(x=>x.trim()).filter(Boolean);
  const limite=Math.min(1000,Math.max(50,Number(req.query.limite)||500));
  const rows=await prisma.stateHistory.findMany({where:{usuarioId:req.userId,...(chaves.length?{chave:{in:chaves}}:{})},orderBy:{criadoEm:'desc'},take:limite});
  res.json(rows.map(r=>({id:String(r.id),chave:r.chave,valor:r.valor,criadoEm:r.criadoEm})));
});

// Um blob específico
stateRouter.get('/:chave', async (req, res) => {
  const r = await prisma.userState.findUnique({
    where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } },
  });
  res.json(r ? r.valor : null);
});

// Grava (upsert) um blob
stateRouter.put('/:chave', async (req, res) => {
  if(req.params.chave==='xp:bonus') return res.status(403).json({erro:'Ajuste de XP é reservado ao sistema.'});
  let valor = req.body?.valor;
  const versaoRecebida = BigInt(Math.max(0, Number(req.body?.versao || Date.now())));
  const atual = await prisma.userState.findUnique({ where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } } });
  if (atual && atual.versao > versaoRecebida) return res.json({ ok: true, valor: atual.valor, versao: Number(atual.versao), ignorada: true });
  if (req.params.chave === 'rotina:dias') {
    valor = mergeRotinaDias(atual?.valor, valor);
  }
  await prisma.userState.upsert({
    where: { usuarioId_chave: { usuarioId: req.userId, chave: req.params.chave } },
    update: { valor, versao: versaoRecebida },
    create: { usuarioId: req.userId, chave: req.params.chave, valor, versao: versaoRecebida },
  });
  if(!atual||JSON.stringify(atual.valor)!==JSON.stringify(valor)){
    await prisma.stateHistory.create({data:{usuarioId:req.userId,chave:req.params.chave,valor}}).catch(()=>{});
  }
  const xpAtual=['treino:logs','estudo:logs','alim:agua'].includes(req.params.chave) ? await recalcularXp(req.userId) : null;
  // sync ao vivo: avisa os OUTROS aparelhos do mesmo usuário (src = quem escreveu, pra não ecoar nele)
  emitToUser(req.userId, 'state:changed', { chave: req.params.chave, valor, versao:Number(versaoRecebida), src: req.body?.clientId || null });
  res.json({ ok: true, valor, versao:Number(versaoRecebida), ...(xpAtual!==null?{xp:xpAtual}:{}) });
});

stateRouter.delete('/:chave', async (req, res) => {
  if (req.params.chave === 'xp:bonus') return res.status(403).json({ erro: 'Ajuste de XP é reservado ao sistema.' });
  const anterior=await prisma.userState.findUnique({where:{usuarioId_chave:{usuarioId:req.userId,chave:req.params.chave}}});
  await prisma.userState.deleteMany({ where: { usuarioId: req.userId, chave: req.params.chave } });
  if(anterior)await prisma.stateHistory.create({data:{usuarioId:req.userId,chave:req.params.chave,valor:null}}).catch(()=>{});
  if (['treino:logs', 'estudo:logs', 'alim:agua'].includes(req.params.chave)) await recalcularXp(req.userId);
  emitToUser(req.userId, 'state:changed', { chave: req.params.chave, valor: null, src: req.query.src || null });
  res.status(204).end();
});

export default stateRouter;
