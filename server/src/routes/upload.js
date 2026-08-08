import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exigirAuth } from '../lib/auth.js';

export const uploadRouter = Router();
uploadRouter.use(exigirAuth);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const PUBLIC_BASE = process.env.PUBLIC_MEDIA_BASE || '/uploads';

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
      // Comprime no servidor: máx 1280px, JPEG q75 (mesmo espírito da compressão do cliente)
      const buf = await sharp(req.file.buffer).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
      const nome = `${id}.jpg`;
      await writeFile(path.join(UPLOAD_DIR, nome), buf);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo: 'foto' });
    } else if (req.file.mimetype.startsWith('video/')) {
      const ext = (req.file.originalname.match(/\.[a-z0-9]+$/i) || ['.mp4'])[0];
      const nome = `${id}${ext}`;
      await writeFile(path.join(UPLOAD_DIR, nome), req.file.buffer);
      return res.status(201).json({ url: `${PUBLIC_BASE}/${nome}`, tipo: 'video' });
    }
    return res.status(415).json({ erro: 'Tipo de arquivo não suportado.' });
  } catch (e) {
    console.error('upload erro', e);
    return res.status(500).json({ erro: 'Falha ao processar a mídia.' });
  }
});

export default uploadRouter;
