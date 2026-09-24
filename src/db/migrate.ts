import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db } from './index.js';

// Versioned migration files, run in filename order, tracked in
// schema_migrations. Kept dead simple for MVP (PRD §11): this is what makes
// "move to Postgres later" a data-export problem, not a redesign — the same
// numbered-migration discipline carries over.

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function runMigrations() {
  ensureMigrationsTable();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedRows = db
    .prepare('SELECT version FROM schema_migrations')
    .all() as { version: string }[];
  const applied = new Set(appliedRows.map((r) => r.version));

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`[migrate] applying ${file}`);
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }

  console.log('[migrate] up to date');
}

// Allow running directly: `npm run migrate`
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations();
}
