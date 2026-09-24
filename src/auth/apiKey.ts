import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.js';

// The other of the two distinct credentials per PRD §9: this authenticates an
// agent into the MCP endpoint via the URL path (no session). Only the hash is
// ever stored — the raw key is shown to the user exactly once, at creation
// or rotation time, matching PRD §13's "treat the MCP key like a secret"
// requirement (no query-string logging, easy rotation, one-click revoke).

const PREFIX_LEN = 8;

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export interface CreatedApiKey {
  id: number;
  rawKey: string; // show this to the user ONCE; never persisted in plaintext
}

export function createApiKey(userId: number): CreatedApiKey {
  const rawKey = `qk_${randomBytes(24).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, PREFIX_LEN);

  const result = db
    .prepare(
      `INSERT INTO api_keys (user_id, key_hash, key_prefix) VALUES (?, ?, ?)`
    )
    .run(userId, keyHash, keyPrefix);

  return { id: Number(result.lastInsertRowid), rawKey };
}

export function revokeApiKey(keyId: number, userId: number): void {
  db.prepare(
    `UPDATE api_keys SET revoked_at = datetime('now')
     WHERE id = ? AND user_id = ? AND revoked_at IS NULL`
  ).run(keyId, userId);
}

/**
 * Resolve a raw API key (as it appears in the MCP URL path) to a user id.
 * Returns null if the key is unknown or revoked — callers must treat that as
 * an auth failure, never fall back to any other identification.
 */
export function resolveApiKey(rawKey: string): { userId: number; apiKeyId: number } | null {
  const keyHash = hashKey(rawKey);

  const row = db
    .prepare(
      `SELECT id, user_id, key_hash FROM api_keys
       WHERE key_hash = ? AND revoked_at IS NULL`
    )
    .get(keyHash) as { id: number; user_id: number; key_hash: string } | undefined;

  if (!row) return null;

  // Defense in depth: constant-time compare even though the lookup was by
  // exact hash match (protects against timing side-channels on hash lookup
  // implementations that aren't guaranteed constant-time).
  const expected = Buffer.from(row.key_hash);
  const actual = Buffer.from(keyHash);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  return { userId: row.user_id, apiKeyId: row.id };
}

export function listApiKeysForUser(userId: number) {
  return db
    .prepare(
      `SELECT id, key_prefix, created_at, revoked_at FROM api_keys
       WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId);
}
