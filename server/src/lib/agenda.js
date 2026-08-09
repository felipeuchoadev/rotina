// DISCIPLINA — agenda de avisos programados.
// Uma vez por dia (a partir das 9h de Brasília) varre as datas importantes de
// cada usuário (UserState chave='datas') e dispara Web Push nos marcos:
// 1 mês / 1 semana / 1 dia antes e no dia do aniversário/evento.
// Dedupe pelo Kv 'agenda:lastRun' (roda no máximo 1x por dia, mesmo com restart).
import { prisma } from './db.js';
import { enviarPush } from './push.js';

function brasiliaAgora() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}
function isoDe(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MARCOS = [
  { dias: 30, chave: 'm',   txt: (n) => `Falta 1 mês pro aniversário de ${n}. Já vai pensando no presente.` },
  { dias: 7,  chave: 's',   txt: (n) => `Falta 1 semana pro aniversário de ${n}. Se prepara.` },
  { dias: 1,  chave: 'd',   txt: (n) => `Amanhã é aniversário de ${n}. Não esquece.` },
  { dias: 0,  chave: 'dia', txt: (n) => `Hoje é aniversário de ${n}! Manda o parabéns.` },
];

// dias até a próxima ocorrência da data (recorrente = mesmo dia/mês todo ano)
function diasAte(item, hoje) {
  const [Y, M, D] = String(item.data || '').split('-').map(Number);
  if (!M || !D) return null;
  if (item.recorrente === false) {
    const o = new Date(Y, M - 1, D); o.setHours(0, 0, 0, 0);
    return Math.round((o - hoje) / 86400000);
  }
  let o = new Date(hoje.getFullYear(), M - 1, D); o.setHours(0, 0, 0, 0);
  if (o < hoje) o = new Date(hoje.getFullYear() + 1, M - 1, D);
  return Math.round((o - hoje) / 86400000);
}

async function jaRodou(iso) {
  try { const kv = await prisma.kv.findUnique({ where: { chave: 'agenda:lastRun' } }); return kv && kv.valor === iso; }
  catch { return false; }
}
async function marcarRodou(iso) {
  try { await prisma.kv.upsert({ where: { chave: 'agenda:lastRun' }, update: { valor: iso }, create: { chave: 'agenda:lastRun', valor: iso } }); }
  catch {}
}

async function rodarAgenda() {
  const agora = brasiliaAgora();
  if (agora.getHours() < 9) return;               // avisa a partir das 9h
  const hoje = new Date(agora); hoje.setHours(0, 0, 0, 0);
  const iso = isoDe(hoje);
  if (await jaRodou(iso)) return;

  let rows;
  try { rows = await prisma.userState.findMany({ where: { chave: 'datas' } }); }
  catch { return; }

  for (const row of rows) {
    const datas = Array.isArray(row.valor) ? row.valor : [];
    for (const item of datas) {
      if (!item || !item.data) continue;
      const dd = diasAte(item, hoje);
      const marco = MARCOS.find((m) => m.dias === dd);
      if (!marco) continue;
      const av = item.avisos || {};
      if (av[marco.chave] === false) continue;     // desligado pra essa data
      const nome = item.nome || 'alguém';
      const evento = item.tipo === 'evento';
      const body = evento
        ? (dd === 0 ? `Hoje: ${nome}.` : dd === 1 ? `Amanhã: ${nome}.` : dd === 7 ? `Falta 1 semana: ${nome}.` : `Falta 1 mês: ${nome}.`)
        : marco.txt(nome);
      await enviarPush(row.usuarioId, { title: 'DISCIPLINA', body, tag: 'agenda-' + (item.id || dd), url: '/rotina/#tab=inicio' });
    }
  }
  await marcarRodou(iso);
}

export function iniciarAgenda() {
  rodarAgenda().catch(() => {});
  setInterval(() => { rodarAgenda().catch(() => {}); }, 30 * 60 * 1000); // reavalia a cada 30 min
}
