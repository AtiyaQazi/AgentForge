import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

// node:sqlite is used per PRD §7: "Node's built-in node:sqlite needs no native
// build step." It's still experimental (hence the warning at startup) — the
// PRD explicitly frames this as an MVP choice that migrates to Postgres later
// (see db/migrate.ts comment and PRD §7/§13 for the migration path).

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

// Reasonable defaults for a single-file, single-process app.
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
