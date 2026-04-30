import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const g = globalThis as unknown as { prisma: PrismaClient; pool: Pool };

function createClient() {
  const url = (process.env.DATABASE_URL ?? '').replace('&channel_binding=require', '');
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 180_000,        // keep connections alive 3 min
    connectionTimeoutMillis: 30_000,   // Neon cold start can take up to ~20s
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  g.pool = pool;
  pool.query('SELECT 1').catch(() => {});
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = g.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
