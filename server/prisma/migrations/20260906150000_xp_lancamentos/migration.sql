CREATE TABLE "xp_lancamentos" ("id" BIGSERIAL NOT NULL,"usuarioId" TEXT NOT NULL,"eventoId" TEXT NOT NULL,"tipo" TEXT NOT NULL,"descricao" TEXT NOT NULL,"pontos" INTEGER NOT NULL,"ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "xp_lancamentos_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "xp_lancamentos_usuarioId_eventoId_key" ON "xp_lancamentos"("usuarioId", "eventoId");
CREATE INDEX "xp_lancamentos_usuarioId_ocorridoEm_id_idx" ON "xp_lancamentos"("usuarioId", "ocorridoEm", "id");
ALTER TABLE "xp_lancamentos" ADD CONSTRAINT "xp_lancamentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
