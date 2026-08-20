const DOMINIOS_CORRETOS = new Set([
  'gmail.com','hotmail.com','hotmail.com.br','outlook.com','outlook.com.br',
  'live.com','icloud.com','yahoo.com','yahoo.com.br','proton.me','protonmail.com',
  'uol.com.br','bol.com.br','terra.com.br','globo.com',
]);

const CORRECOES = new Map([
  ['gmal.com','gmail.com'],['gmai.com','gmail.com'],['gmial.com','gmail.com'],
  ['gmail.con','gmail.com'],['gmail.coml','gmail.com'],['gmail.co','gmail.com'],
  ['hotmal.com','hotmail.com'],['hotmai.com','hotmail.com'],['hotmail.con','hotmail.com'],
  ['outlok.com','outlook.com'],['outloo.com','outlook.com'],['outlook.con','outlook.com'],
  ['yaho.com','yahoo.com'],['yahoo.con','yahoo.com'],['yahoo.coml','yahoo.com'],
  ['icloud.con','icloud.com'],['iclod.com','icloud.com'],
]);

export function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase();
}

export function validarEmailPadrao(valor) {
  const email = normalizarEmail(valor);
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,63}$/i.test(email)) return { ok:false, email, erro:'E-mail inválido. Confira o endereço completo.' };
  const dominio = email.split('@')[1];
  const sugestao = CORRECOES.get(dominio);
  if (sugestao) return { ok:false, email, sugestao:`${email.slice(0,email.lastIndexOf('@')+1)}${sugestao}`, erro:`O domínio “${dominio}” parece estar digitado errado.` };
  if (/\.(coml|comm|con|cmo|nett|orgg)$/i.test(dominio)) return { ok:false, email, erro:`O domínio “${dominio}” não é válido.` };
  return { ok:true, email, conhecido:DOMINIOS_CORRETOS.has(dominio) };
}
