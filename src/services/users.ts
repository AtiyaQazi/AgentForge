import { db } from '../db/index.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { createApiKey, type CreatedApiKey } from '../auth/apiKey.js';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface SignupResult {
  user: { id: number; email: string };
  apiKey: CreatedApiKey; // rawKey shown once, on the signup response only
}

/**
 * Signup creates both credentials in one step, per PRD §8: "a new user lands
 * with a working dashboard login and a working MCP URL at the same time."
 */
export function signup(email: string, password: string): SignupResult {
  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get(email);
  if (existing) {
    throw new Error('An account with that email already exists.');
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare(`INSERT INTO users (email, password_hash) VALUES (?, ?)`)
    .run(email, passwordHash);

  const userId = Number(result.lastInsertRowid);
  const apiKey = createApiKey(userId);

  return { user: { id: userId, email }, apiKey };
}

export function findUserByEmail(email: string): User | null {
  const row = db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email) as User | undefined;
  return row ?? null;
}

export function findUserById(id: number): User | null {
  const row = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as User | undefined;
  return row ?? null;
}

/** Returns the user id on success, or null on bad credentials. */
export function login(email: string, password: string): number | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user.id;
}
