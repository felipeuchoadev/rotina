const dataValida = (valor, hoje) => /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) && valor <= hoje;

const minutosValidos = valor => {
  const ms = Number(valor);
  return Number.isFinite(ms) && ms >= 60_000 && ms <= 86_400_000 ? Math.floor(ms / 60_000) : 0;
};

export function calcularExtratoXp(estados = {}, perfil = {}, hoje) {
  const itens = [];
  const treino = Array.isArray(estados['treino:logs']) ? estados['treino:logs'] : [];
  const estudo = Array.isArray(estados['estudo:logs']) ? estados['estudo:logs'] : [];
  const materias = Array.isArray(estados['estudo:materias']) ? estados['estudo:materias'] : [];
  const nomesConteudo = new Map();
  for (const materia of materias) {
    for (const conteudo of Array.isArray(materia?.conteudos) ? materia.conteudos : []) {
      if (conteudo?.id) nomesConteudo.set(String(conteudo.id), String(conteudo.nome || conteudo.id));
    }
  }

  for (const log of treino) {
    if (!dataValida(log?.dateISO, hoje)) continue;
    const minutos = minutosValidos(log?.ativoMs);
    if (minutos) itens.push({ tipo:'treino', dateISO:log.dateISO, at:Number(log.updatedAt || 0), xp:minutos, txt:`Treino: ${log.nome || 'sessão'} · ${minutos} min ativo(s)` });
  }

  for (const log of estudo) {
    if (!dataValida(log?.dateISO, hoje)) continue;
    const minutos = minutosValidos(log?.ativoMs);
    if (minutos) itens.push({ tipo:'estudo', dateISO:log.dateISO, at:Number(log.updatedAt || 0), xp:minutos * 2, txt:`Estudo: ${log.materia || 'matéria'} · ${minutos} min × 2 XP` });
    for (const id of new Set((Array.isArray(log?.conteudos) ? log.conteudos : []).filter(Boolean).map(String))) {
      itens.push({ tipo:'estudo', dateISO:log.dateISO, at:Number(log.updatedAt || 0), xp:40, txt:`Conteúdo concluído: ${nomesConteudo.get(id) || id}` });
    }
  }

  const metaAgua = Math.max(250, Number(perfil?.metaAgua || 2500));
  const agua = estados['alim:agua'] && typeof estados['alim:agua'] === 'object' && !Array.isArray(estados['alim:agua']) ? estados['alim:agua'] : {};
  for (const [dia, valor] of Object.entries(agua)) {
    const ml = Number(valor);
    if (dataValida(dia, hoje) && Number.isFinite(ml) && ml >= metaAgua && ml <= 20_000) {
      itens.push({ tipo:'agua', dateISO:dia, at:0, xp:15, txt:`Meta de água: ${ml.toLocaleString('pt-BR')} de ${metaAgua.toLocaleString('pt-BR')} ml` });
    }
  }

  const rotina = estados['rotina:dias'] && typeof estados['rotina:dias'] === 'object' && !Array.isArray(estados['rotina:dias']) ? estados['rotina:dias'] : {};
  for (const [dia, atividades] of Object.entries(rotina)) {
    if (!dataValida(dia, hoje) || !Array.isArray(atividades)) continue;
    for (const atividade of atividades.slice(0, 100)) {
      const xp = atividade?.done === true ? 10 : dia < hoje ? -10 : 0;
      if (!xp) continue;
      itens.push({ tipo:'rotina', dateISO:dia, at:Number(atividade?.updatedAt || 0), xp, txt:xp > 0 ? `Rotina cumprida: ${atividade?.nome || 'atividade'}${atividade?.hora ? ` (${atividade.hora})` : ''}` : `Rotina não cumprida: ${atividade?.nome || 'atividade'}${atividade?.hora ? ` (${atividade.hora})` : ''}` });
    }
  }

  const bonus = Number(estados['xp:bonus']);
  if (Number.isFinite(bonus) && bonus !== 0) itens.push({ tipo:'ajustes', dateISO:hoje, at:0, xp:Math.floor(bonus), txt:'Bônus/ajuste administrativo' });
  itens.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)) || Number(b.at || 0) - Number(a.at || 0));
  const ganhos = itens.filter(i => i.xp > 0).reduce((s, i) => s + i.xp, 0);
  const perdas = itens.filter(i => i.xp < 0).reduce((s, i) => s + i.xp, 0);
  return { total:Math.max(0, Math.floor(ganhos + perdas)), ganhos, perdas, itens };
}
