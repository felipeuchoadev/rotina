import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../../app/disciplina-v3.html',import.meta.url),'utf8');
const batalha=fs.readFileSync(new URL('../src/routes/batalha.js',import.meta.url),'utf8');

assert.match(html,/const estado=\{uploading:false,error:null,promise:Promise\.resolve\(\),wait:/);
assert.match(html,/await provaUpload\.wait\(\)/);
assert.match(html,/await postUpload\.wait\(\)/);
assert.match(html,/body:\{texto, midiaUrl, midiaTipo, tipo:'manual'\}/);
assert.match(batalha,/midiaTipo: z\.enum\(\['foto', 'video'\]\)/);
console.log('FEED_VIDEO_UPLOAD_TEST=OK');
