/**
 * Creates/resets the admin user using better-auth's exact Node.js hash implementation.
 * Run: node scripts/create-admin.mjs
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Load .env
const env = readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq < 0) continue;
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const { randomBytes, scrypt, randomUUID } = require('crypto');

const EMAIL = 'hyena.shopping@gmail.com';
const PASSWORD = 'Hyena2026!!';
const NAME = 'Hyena Admin';

// ── Exact copy of better-auth's password.node.mjs ──
function generateKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => { if (err) reject(err); else resolve(key); }
    );
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}
// ────────────────────────────────────────────────────

const url = process.env.DATABASE_URL.replace('&channel_binding=require', '');
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function main() {
  const hashed = await hashPassword(PASSWORD);

  const { rows: existing } = await pool.query(
    'SELECT id FROM "user" WHERE email = $1', [EMAIL]
  );

  if (existing.length > 0) {
    const userId = existing[0].id;
    // Delete old account record and re-insert clean one
    await pool.query('DELETE FROM account WHERE "userId" = $1', [userId]);
    await pool.query(
      `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $3, $4, $5, $5)`,
      [randomUUID(), userId, userId, hashed, new Date()]
    );
    console.log('✓ Password reset done.');
  } else {
    const userId = randomUUID();
    const now = new Date();
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, $4, $4)`,
      [userId, NAME, EMAIL, now]
    );
    await pool.query(
      `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $3, $4, $5, $5)`,
      [randomUUID(), userId, userId, hashed, now]
    );
    console.log('✓ Admin user created.');
  }

  // Verify the hash works
  const { rows } = await pool.query('SELECT password FROM account WHERE "providerId" = $1', ['credential']);
  if (rows[0]) {
    const [salt, storedKey] = rows[0].password.split(':');
    const testKey = await generateKey(PASSWORD, salt);
    const match = testKey.toString('hex') === storedKey;
    console.log('✓ Hash self-verify:', match ? 'PASS' : 'FAIL ← problem here');
  }

  console.log(`\n  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  await pool.end();
}

main().catch(err => { console.error('✗', err.message); process.exit(1); });
