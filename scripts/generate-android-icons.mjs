import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require=createRequire(import.meta.url);
const sharp=require('../server/node_modules/sharp');

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'app','icon-512.png');
const res=path.join(root,'android-app','android','app','src','main','res');
const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};

for(const [density,size] of Object.entries(densities)){
  const dir=path.join(res,`mipmap-${density}`);await mkdir(dir,{recursive:true});
  const logo=await sharp(source).resize(size,size,{fit:'cover'}).png().toBuffer();
  await sharp(logo).toFile(path.join(dir,'ic_launcher.png'));
  const mask=Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
  await sharp(logo).composite([{input:mask,blend:'dest-in'}]).png().toFile(path.join(dir,'ic_launcher_round.png'));
  const layerSize=Math.round(size*2.25),markSize=Math.round(layerSize*.72);
  const mark=await sharp(source).resize(markSize,markSize,{fit:'contain'}).png().toBuffer();
  await sharp({create:{width:layerSize,height:layerSize,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:mark,left:Math.floor((layerSize-markSize)/2),top:Math.floor((layerSize-markSize)/2)}])
    .png().toFile(path.join(dir,'ic_launcher_foreground.png'));
}

console.log('Ícones Android REDZONE gerados com a marca oficial.');
