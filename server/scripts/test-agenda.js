import assert from 'node:assert/strict';
import { marcoAgenda, proximaOcorrenciaAgenda } from '../src/lib/agenda.js';

const d = iso => new Date(`${iso}T00:00:00`);
const iso = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
const hoje = d('2026-08-13');
const item = (data, repete='ano') => ({ id:data+repete, nome:'Teste', data, repete, avisos:{m:true,s:true,d:true,dia:true} });

assert.equal(marcoAgenda(item('2000-09-13'), hoje)?.chave, 'm');
assert.equal(marcoAgenda(item('2000-08-20'), hoje)?.chave, 's');
assert.equal(marcoAgenda(item('2000-08-14'), hoje)?.chave, 'd');
assert.equal(marcoAgenda(item('2000-08-13'), hoje)?.chave, 'dia');
assert.equal(marcoAgenda(item('2026-05-31','mes'), d('2026-04-30'))?.chave, 'm');
assert.equal(marcoAgenda(item('2026-08-10','semana'), d('2026-08-16'))?.chave, 'd');
assert.equal(marcoAgenda(item('2026-01-01','dia'), hoje)?.chave, 'dia');
assert.equal(proximaOcorrenciaAgenda(item('2026-08-12','nao'), hoje), null);
assert.equal(proximaOcorrenciaAgenda(item('2026-02-30','ano'), hoje), null);
assert.equal(iso(proximaOcorrenciaAgenda(item('2024-02-29','ano'), hoje)), '2028-02-29');
assert.equal(iso(proximaOcorrenciaAgenda(item('2026-01-31','mes'), d('2026-04-30'))), '2026-05-31');

console.log('Agenda: 11 cenários aprovados.');
