// Agenda de aniversários e datas importantes.
// Executa à 00:00 de Brasília. Cada aviso é
// deduplicado por usuário + item + data + marco para nunca repetir o aviso.
import { prisma } from './db.js';
import { enviarPush } from './push.js';
import { emitToUser } from '../realtime.js';

function brasiliaAgora() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}
function isoDe(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dataValida(y, m, d) {
  const x = new Date(y, m - 1, d); x.setHours(0, 0, 0, 0);
  return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d ? x : null;
}
function somarDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function menosUmMes(d) {
  const ultimo = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), ultimo));
}
function repeticao(item) {
  if (['nao', 'dia', 'semana', 'mes', 'ano'].includes(item?.repete)) return item.repete;
  return item?.recorrente === false ? 'nao' : 'ano';
}

// Próxima ocorrência incluindo hoje. Exportada para testes do calendário.
export function proximaOcorrenciaAgenda(item, hoje) {
  const [y, m, d] = String(item?.data || '').split('-').map(Number);
  if (!dataValida(y, m, d)) return null;
  const rep = repeticao(item);
  if (rep === 'nao') { const x = dataValida(y, m, d); return x >= hoje ? x : null; }
  if (rep === 'dia') return new Date(hoje);
  if (rep === 'semana') {
    const alvo = dataValida(y, m, d).getDay(), x = new Date(hoje);
    x.setDate(x.getDate() + ((alvo - x.getDay() + 7) % 7)); return x;
  }
  if (rep === 'mes') {
    for (let i = 0; i < 24; i++) {
      const base = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const x = dataValida(base.getFullYear(), base.getMonth() + 1, d);
      if (x && x >= hoje) return x;
    }
    return null;
  }
  for (let ano = hoje.getFullYear(); ano <= hoje.getFullYear() + 8; ano++) {
    const x = dataValida(ano, m, d); if (x && x >= hoje) return x;
  }
  return null;
}

export function marcoAgenda(item, hoje) {
  const ocorrencia = proximaOcorrenciaAgenda(item, hoje);
  if (!ocorrencia) return null;
  const atual = isoDe(hoje);
  const candidatos = [
    ['dia', ocorrencia],
    ['d', somarDias(ocorrencia, -1)],
    ['s', somarDias(ocorrencia, -7)],
    ['m', menosUmMes(ocorrencia)],
  ];
  const achado = candidatos.find(([, data]) => isoDe(data) === atual);
  if (achado && item?.avisos?.[achado[0]] !== false) return { chave: achado[0], ocorrencia };
  // Dentro das duas últimas semanas, mantém um lembrete diário curto quando o aviso
  // semanal está habilitado. Assim uma data adicionada depois do marco de 7 dias não fica muda.
  const faltam = Math.round((ocorrencia - hoje) / 86400000);
  if (faltam >= 2 && faltam <= 14 && item?.avisos?.s !== false) return { chave: `proxima-${faltam}`, ocorrencia, faltam };
  return null;
}

function textoAviso(item, chave, faltam, ocorrencia) {
  const nome = item.nome || (item.tipo === 'evento' ? 'Data importante' : 'Aniversário');
  const evento = item.tipo === 'evento';
  if (chave.startsWith('proxima-')) return `Faltam ${faltam} dias para ${nome}.`;
  if (evento) return chave === 'dia' ? `📅 Hoje é um dia importante: ${nome}.` : chave === 'd' ? `Amanhã: ${nome}.` : chave === 's' ? `Falta 1 semana: ${nome}.` : `Falta 1 mês: ${nome}.`;
  if(chave==='dia'){
    const idade=Number(item.anoBase)>0&&ocorrencia ? ocorrencia.getFullYear()-Number(item.anoBase) : null;
    return `🎂 Hoje é aniversário de ${nome}! Envie seus parabéns e celebre esse novo ciclo.${idade>0&&idade<130?` ${nome} está completando ${idade} anos hoje.`:''} Deseje um feliz aniversário!`;
  }
  return chave === 'd' ? `Amanhã é aniversário de ${nome}. Não esquece.` : chave === 's' ? `Falta 1 semana pro aniversário de ${nome}.` : `Falta 1 mês pro aniversário de ${nome}.`;
}

async function jaEnviado(chave) {
  return !!(await prisma.kv.findUnique({ where: { chave } }).catch(() => null));
}
async function marcarEnviado(chave) {
  await prisma.kv.upsert({ where: { chave }, update: { valor: true }, create: { chave, valor: true } });
}

export async function rodarAgenda() {
  const agora = brasiliaAgora();
  const hoje = new Date(agora); hoje.setHours(0, 0, 0, 0);
  const estados = await prisma.userState.findMany({ where: { chave: { in: ['datas', 'config'] } } }).catch(() => []);
  const porUsuario = new Map();
  for (const row of estados) {
    const atual = porUsuario.get(row.usuarioId) || {};
    atual[row.chave] = row.valor; porUsuario.set(row.usuarioId, atual);
  }
  let enviados = 0;
  for (const [usuarioId, estado] of porUsuario) {
    const datas = Array.isArray(estado.datas) ? estado.datas : [];
    for (const item of datas) {
      const marco = marcoAgenda(item, hoje); if (!marco) continue;
      const id = String(item.id || `${item.data}-${item.nome || 'data'}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
      const dedupe = `agenda:${isoDe(hoje)}:${usuarioId}:${id}:${marco.chave}`;
      if (await jaEnviado(dedupe)) continue;
      const body = textoAviso(item, marco.chave, marco.faltam, marco.ocorrencia);
      const notificacao=await prisma.notificacao.create({ data: { usuarioId, tipo: 'aviso', texto: body } }).catch(() => null);
      if(notificacao)emitToUser(usuarioId,'notif:nova',notificacao);
      if(estado.config?.notif === true)await enviarPush(usuarioId, { title: 'REDZONE', body, tag: dedupe, url: '/rotina/#tab=inicio' });
      await marcarEnviado(dedupe); enviados++;
    }
  }
  return { enviados };
}

export function iniciarAgenda() {
  const agendarMeiaNoite=()=>{
    const agora=brasiliaAgora(),proxima=new Date(agora);proxima.setDate(proxima.getDate()+1);proxima.setHours(0,0,0,0);
    setTimeout(async()=>{await rodarAgenda().catch((e)=>console.error('agenda:',e));agendarMeiaNoite();},Math.max(1000,proxima-agora));
  };
  agendarMeiaNoite();
}
