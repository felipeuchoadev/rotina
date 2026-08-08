import { PrismaClient } from '@prisma/client';

// Cliente Prisma único (singleton) reaproveitado em todo o app.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'],
});
