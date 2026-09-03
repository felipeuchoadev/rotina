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

async function comprimirComFfmpeg(buffer, ext, tipo, corte = null, perfil = '') {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rz-media-'));
  const entrada = path.join(dir, 'entrada' + ext), saida = path.join(dir, tipo === 'video' ? 'saida.mp4' : 'saida.ogg');
  try {
    await writeFile(entrada, buffer);
    const demonstracao=perfil==='demonstracao';
    const args = tipo === 'video'
      ? ['-y','-i',entrada,...(corte?['-ss',String(corte.inicio),'-t',String(corte.duracao)]:[]),'-vf',`scale=min(${demonstracao?960:1280}\\,iw):-2`,'-c:v','libx264','-preset',demonstracao?'ultrafast':'superfast','-crf',demonstracao?'29':'27','-c:a','aac','-b:a',demonstracao?'64k':'96k','-movflags','+faststart',saida]
      : ['-y','-i',entrada,'-vn','-c:a','libopus','-b:a','64k',saida];
    await execFileAsync('ffmpeg', args, { timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
    const comprimido = await readFile(saida);
    return comprimido;
  } finally { await rm(dir, { recursive: true, force: true }).catch(()=>{}); }
}

// Toda mídia passa pelo otimizador antes de ser persistida. O arquivo original
// só vence quando já é menor que a nova codificação (ou seja, já está mais comprimido).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB (vídeo curto)
});

function receberArquivo(req, res, next) {
  upload.single('arquivo')(req, res, (erro) => {
    if (!erro) return next();
    if (erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ erro: 'A mídia ultrapassa o limite de 60 MB.' });
    }
    console.error('recebimento de upload', erro);
    return res.status(400).json({ erro: 'Não foi possível receber essa mídia.' });
  });
}

uploadRouter.post('/', receberArquivo, async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  await mkdir(UPLOAD_DIR, { recursive: true });
  const mime = String(req.file.mimetype || '').toLowerCase();
  const ext = path.extname(req.file.originalname || '').toLowerCase();
  const extensoesImagem = new Set(['.jpg','.jpeg','.png','.webp','.gif','.heic','.heif']);
  const extensoesVideo = new Set(['.mp4','.webm','.mov','.m4v','.mkv','.avi']);
  const extensoesAudio = new Set(['.mp3','.wav','.ogg','.opus','.m4a','.aac']);
  // Alguns navegadores gravam WebM, mas enviam application/octet-stream ou
  // video/x-matroska. A extensão segura completa a identificação do conteúdo.
  const ehImagem = mime.startsWith('image/') || extensoesImagem.has(ext);
  const ehAudio = mime.startsWith('audio/') || extensoesAudio.has(ext);
  const ehVideo = !ehAudio && (mime.startsWith('video/') || mime.includes('matroska') || extensoesVideo.has(ext));
  const id = randomUUID();

  try {
    if (ehImagem) {
      // GIFs continuam animados; imagens com transparência viram WebP; fotos
      // usam JPEG progressivo. Nunca achatamos figurinha/GIF em um quadro JPEG.
      const ehGif = mime === 'image/gif' || ext === '.gif';
      const base = sharp(req.file.buffer, { animated: ehGif }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true });
      let buf, nome, tipo = 'foto';
      if (ehGif) {
        const otimizado = await base.gif({ effort: 5 }).toBuffer();
        buf = otimizado.length < req.file.buffer.length ? otimizado : req.file.buffer;
        nome = `${id}.gif`; tipo = 'gif';
      } else {
        const meta = await sharp(req.file.buffer).metadata();
        if (meta.hasAlpha || ext === '.webp') { buf = await base.webp({ quality: 82, alphaQuality: 92, effort: 4 }).toBuffer(); nome = `${id}.webp`; }
        else { buf = await base.jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer(); nome = `${id}.jpg`; }
      }
      await writeFile(path.join(UPLOAD_DIR, nome), buf);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo });
    } else if (ehVideo) {
      const extEntrada = ext || '.webm';
      const recebeuCorte = req.body.inicio !== undefined || req.body.fim !== undefined;
      const inicio = Number(req.body.inicio), fim = Number(req.body.fim);
      const corte = recebeuCorte && Number.isFinite(inicio) && Number.isFinite(fim) && inicio >= 0 && fim > inicio && fim - inicio <= 60.05
        ? { inicio, duracao: Math.min(60, fim - inicio) } : null;
      if (recebeuCorte && !corte) return res.status(400).json({ erro: 'Trecho de vídeo inválido. Escolha até 60 segundos.' });
      let nome = `${id}.mp4`;
      const perfil=String(req.body.perfil||'');
      const comprimido = await comprimirComFfmpeg(req.file.buffer, extEntrada, 'video', corte, perfil);
      const usarComprimido = corte || comprimido.length < req.file.buffer.length;
      const buf = usarComprimido ? comprimido : req.file.buffer;
      if (!usarComprimido) nome = `${id}${extEntrada}`;
      await writeFile(path.join(UPLOAD_DIR, nome), buf);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo: 'video' });
    } else if (ehAudio) {
      const extEntrada = ext || '.webm';
      let nome = `${id}.ogg`;
      const comprimido = await comprimirComFfmpeg(req.file.buffer, extEntrada, 'audio');
      const usarComprimido = comprimido.length < req.file.buffer.length;
      const buf = usarComprimido ? comprimido : req.file.buffer;
      if (!usarComprimido) nome = `${id}${extEntrada}`;
      await writeFile(path.join(UPLOAD_DIR, nome), buf);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo: 'audio' });
    }
    return res.status(415).json({ erro: 'Tipo de arquivo não suportado.' });
  } catch (e) {
    console.error('upload erro', e);
    return res.status(500).json({ erro: 'Não foi possível comprimir essa mídia. Tente gravar ou selecionar novamente.' });
  }
});

export default uploadRouter;
