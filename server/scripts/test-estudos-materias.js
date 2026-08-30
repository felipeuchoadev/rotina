import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../../app/disciplina-v3.html', import.meta.url), 'utf8');
const inicio = html.indexOf('function chaveMateria');
const fim = html.indexOf('function renderEstudos', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'Funções de matérias não encontradas no HTML');

const trecho = html.slice(inicio, fim);
const S = {
  materias: [
    { id:'hist-1', nome:'História', conteudos:[{ id:'cont-1', nome:'A História do Brasil até\n1500', done:false, tempoMs:1000 }] },
    { id:'hist-2', nome:' história ', conteudos:[
      { id:'cont-2', nome:'A História do Brasil até\n1500', done:true, tempoMs:2000 },
      { id:'cont-3', nome:'Brasil Colônia', done:false, tempoMs:0 },
    ] },
    { id:'mat-1', nome:'Matemática', conteudos:[] },
  ],
  estudoSemana: { seg:['hist-1','hist-2','mat-1'] },
  estudoLogs: [{ materiaId:'hist-2', conteudos:['cont-2','cont-3'] }],
};
const salvos = [];
const api = new Function('S', 'save', `${trecho}; return { chaveConteudo, consolidarMateriasDuplicadas };`)(S, chave=>salvos.push(chave));

assert.notEqual(api.chaveConteudo('A História do Brasil até\n1500'), api.chaveConteudo('A História do Brasil até'));
assert.equal(api.consolidarMateriasDuplicadas(), true);
assert.equal(S.materias.length, 2, 'Matérias iguais devem virar um único bloco');
assert.equal(S.materias[0].conteudos.length, 2, 'Conteúdos diferentes precisam ser preservados');
assert.equal(S.materias[0].conteudos[0].nome, 'A História do Brasil até\n1500', 'Quebra de linha deve permanecer no mesmo conteúdo');
assert.equal(S.materias[0].conteudos[0].done, true, 'Progresso da duplicata deve ser preservado');
assert.equal(S.materias[0].conteudos[0].tempoMs, 2000, 'Maior tempo registrado deve ser preservado sem somar duplicação');
assert.deepEqual(S.estudoSemana.seg, ['hist-1','mat-1'], 'Agenda deve apontar uma única vez para a matéria consolidada');
assert.equal(S.estudoLogs[0].materiaId, 'hist-1', 'Sessão deve continuar vinculada à matéria consolidada');
assert.deepEqual(S.estudoLogs[0].conteudos, ['cont-1','cont-3'], 'Conteúdos da sessão devem continuar vinculados');
assert.deepEqual(salvos.sort(), ['estudo:logs','estudo:materias','estudo:semana']);
assert.match(html, /Cada conteúdo fica no próprio bloco/);
assert.match(html, /Marque somente os conteúdos concluídos em/);

console.log('ESTUDOS_MATERIAS_TEST=OK');
