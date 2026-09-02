import assert from 'node:assert/strict';
import { calcularExtratoXp } from '../src/lib/xp-ledger.js';

const hoje = '2026-09-02';
const base = {
  'estudo:materias':[{ id:'m1', conteudos:[{ id:'c1', nome:'Acentuação' }] }],
  'estudo:logs':[{ materia:'Português', materiaId:'m1', dateISO:hoje, ativoMs:15_000, conteudos:['c1','c1'] }],
};
const curto = calcularExtratoXp(base, { metaAgua:2500 }, hoje);
assert.equal(curto.total, 40, 'conteúdo concluído vale 40 XP mesmo numa sessão com menos de um minuto');
assert.equal(curto.ganhos, 40);
assert.equal(curto.itens.length, 1);
assert.match(curto.itens[0].txt, /Acentuação/);

const completo = calcularExtratoXp({
  ...base,
  'treino:logs':[{ nome:'Corrida', dateISO:hoje, ativoMs:120_000 }],
  'estudo:logs':[{ materia:'Português', materiaId:'m1', dateISO:hoje, ativoMs:60_000, conteudos:['c1'] }],
  'alim:agua':{ [hoje]:2500 },
  'rotina:dias':{ '2026-09-01':[{ nome:'Arrumar a casa', done:false }], [hoje]:[{ nome:'Ler', done:true }] },
}, { metaAgua:2500 }, hoje);
assert.equal(completo.ganhos, 69);
assert.equal(completo.perdas, -10);
assert.equal(completo.total, 59);
assert.equal(completo.itens.reduce((s, i) => s + i.xp, 0), 59);

const futuro = calcularExtratoXp({ 'estudo:logs':[{ dateISO:'2026-09-03', ativoMs:60_000, conteudos:['c1'] }] }, {}, hoje);
assert.equal(futuro.total, 0, 'lançamento futuro não pode gerar XP');

console.log('XP_LEDGER_TEST=OK');
