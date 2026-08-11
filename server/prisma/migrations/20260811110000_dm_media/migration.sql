ALTER TABLE "mensagens" ADD COLUMN "midiaUrl" TEXT;
ALTER TABLE "mensagens" ADD COLUMN "midiaTipo" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "ultimoAcesso" TIMESTAMP(3);
