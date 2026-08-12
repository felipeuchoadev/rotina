-- Nome de guerra é uma identidade: não permite duplicação ignorando caixa e espaços nas bordas.
CREATE UNIQUE INDEX "Usuario_nomeGuerra_normalized_key"
ON "usuarios" (LOWER(BTRIM("nomeGuerra")));
