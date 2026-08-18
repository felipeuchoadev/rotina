import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, rm, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exigirAuth } from '../lib/auth.js';

export const uploadRouter = Router();
uploadRouter.use(exigirAuth);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const PUBLIC_BASE = process.env.PUBLIC_MEDIA_BASE || '/uploads';
const execFileAsync = promisify(execFile);

async function comprimirComFfmpeg(buffer, ext, tipo, corte = null) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rz-media-'));
  const entrada = path.join(dir, 'entrada' + ext), saida = path.join(dir, tipo === 'video' ? 'saida.mp4' : 'saida.ogg');
  try {
    await writeFile(entrada, buffer);
    const args = tipo === 'video'
      ? ['-y','-i',entrada,...(corte?['-ss',String(corte.inicio),'-t',String(corte.duracao)]:[]),'-vf','scale=min(1280\\,iw):-2','-c:v','libx264','-preset','superfast','-crf','27','-c:a','aac','-b:a','96k','-movflags','+faststart',saida]
      : ['-y','-i',entrada,'-vn','-c:a','libopus','-b:a','64k',saida];
    await execFileAsync('ffmpeg', args, { timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
    const comprimido = await readFile(saida);
    return comprimido;
  } finally { await rm(dir, { recursive: true, force: true }).catch(()=>{}); }
}

// Guarda em memória; imagem é recomprimida, vídeo é gravado como veio.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB (vídeo curto)
});

uploadRouter.post('/', upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ehImagem = req.file.mimetype.startsWith('image/');
  const id = randomUUID();

  try {
    if (ehImagem) {
      // JPEG progressivo e otimizado: tamanho baixo sem destruir detalhes visíveis.
      const buf = await sharp(req.file.buffer).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 78, progressive: true, mozjpeg: true }).toBuffer();
      const nome = `${id}.jpg`;
      await writeFile(path.join(UPLOAD_DIR, nome), buf);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo: 'foto' });
    } else if (req.file.mimetype.startsWith('video/')) {
      const ext = (req.file.originalname.match(/\.[a-z0-9]+$/i) || ['.mp4'])[0];
      const recebeuCorte = req.body.inicio !== undefined || req.body.fim !== undefined;
      const inicio = Number(req.body.inicio), fim = Number(req.body.fim);
      const corte = recebeuCorte && Number.isFinite(inicio) && Number.isFinite(fim) && inicio >= 0 && fim > inicio && fim - inicio <= 60.05
        ? { inicio, duracao: Math.min(60, fim - inicio) } : null;
      if (recebeuCorte && !corte) return res.status(400).json({ erro: 'Trecho de vídeo inválido. Escolha até 60 segundos.' });
      let nome = `${id}.mp4`;
      let buf=req.file.buffer; try{const comprimido=await comprimirComFfmpeg(buf,ext,'video',corte);if(corte||comprimido.length<buf.length)buf=comprimido;else nome=`${id}${ext}`;}catch(e){if(corte)throw e;nome=`${id}${ext}`;console.warn('Compressão de vídeo indisponível:',e.message);}
      await writeFile(path.join(UPLOAD_DIR, nome), buf);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo: 'video' });
    } else if (req.file.mimetype.startsWith('audio/')) {
      const ext = (req.file.originalname.match(/\.[a-z0-9]+$/i) || ['.webm'])[0];
      let nome = `${id}.ogg`;
      let buf=req.file.buffer; try{const comprimido=await comprimirComFfmpeg(buf,ext,'audio');if(comprimido.length<buf.length)buf=comprimido;else nome=`${id}${ext}`;}catch(e){nome=`${id}${ext}`;console.warn('Compressão de áudio indisponível:',e.message);}
      await writeFile(path.join(UPLOAD_DIR, nome), buf);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo: 'audio' });
    }
    return res.status(415).json({ erro: 'Tipo de arquivo não suportado.' });
  } catch (e) {
    console.error('upload erro', e);
    return res.status(500).json({ erro: 'Falha ao processar a mídia.' });
  }
});

export default uploadRouter;
