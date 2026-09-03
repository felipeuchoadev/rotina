import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../../app/disciplina-v3.html',import.meta.url),'utf8');
const batalha=fs.readFileSync(new URL('../src/routes/batalha.js',import.meta.url),'utf8');
const upload=fs.readFileSync(new URL('../src/routes/upload.js',import.meta.url),'utf8');

assert.match(html,/const estado=\{uploading:false,error:null,promise:Promise\.resolve\(\),wait:/);
assert.match(html,/await provaUpload\.wait\(\)/);
assert.match(html,/await postUpload\.wait\(\)/);
assert.match(html,/body:\{texto, midiaUrl, midiaTipo, tipo:'manual'\}/);
assert.match(batalha,/midiaTipo: z\.enum\(\['foto', 'video'\]\)/);
assert.match(upload,/perfil==='demonstracao'/);
assert.match(upload,/demonstracao\?'ultrafast':'superfast'/);
assert.match(html,/perfil:'demonstracao'/);
assert.match(html,/class="training-caption"/);
assert.match(html,/if\(!edit\|\|!DIAS\.includes\(treinoDiaSel\)\) treinoDiaSel=hojeDia\(\)/);
console.log('FEED_VIDEO_UPLOAD_TEST=OK');
