import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-inseguro-troque';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

export async function hashSenha(senha) {
  return bcrypt.hash(senha, 12);
}
export async function conferirSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}
export function assinarToken(usuario) {
  return jwt.sign({ sub: usuario.id, username: usuario.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Middleware: exige Authorization: Bearer <token> e injeta req.userId
export function exigirAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Sem token.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}
