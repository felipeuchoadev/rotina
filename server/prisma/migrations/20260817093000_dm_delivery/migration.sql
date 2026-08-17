ALTER TABLE "mensagens" ADD COLUMN "entregue" BOOLEAN NOT NULL DEFAULT false;

UPDATE "mensagens" SET "entregue" = true WHERE "lida" = true;
