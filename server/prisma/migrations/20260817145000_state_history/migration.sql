CREATE TABLE "state_history" (
  "id" BIGSERIAL NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "valor" JSONB NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "state_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "state_history_usuarioId_criadoEm_idx" ON "state_history"("usuarioId", "criadoEm");
CREATE INDEX "state_history_usuarioId_chave_criadoEm_idx" ON "state_history"("usuarioId", "chave", "criadoEm");
