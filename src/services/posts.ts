import { db } from '../db/index.js';

// This is the shared backend layer referenced in PRD §7: "one shared
// logic/data-access layer — MCP tool handlers, the dashboard, and the public
// site all read/write through it, so behavior can't diverge between
// surfaces." Every function here takes userId explicitly and scopes its
// query by it — no function trusts a caller-supplied post ownership claim
// (PRD §9 isolation requirement).

export type PostStatus = 'draft' | 'published' | 'scheduled';

export interface Post {
  id: number;
  user_id: number;
  title: string;
  slug: string;
  content_md: string;
  tags: string; // JSON-encoded array
  status: PostStatus;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `post-${Date.now()}`
  );
}

/** Ensures slug uniqueness per user by appending -2, -3, ... on collision. */
function uniqueSlug(userId: number, base: string, excludePostId?: number): string {
  let candidate = base;
  let n = 2;
  for (;;) {
    const row = db
      .prepare(
        `SELECT id FROM posts WHERE user_id = ? AND slug = ? AND id != ?`
      )
      .get(userId, candidate, excludePostId ?? -1);
    if (!row) return candidate;
    candidate = `${base}-${n++}`;
  }
}

export function createPost(
  userId: number,
  input: { title: string; content?: string; tags?: string[] }
): Post {
  const slug = uniqueSlug(userId, slugify(input.title));
  const tagsJson = JSON.stringify(input.tags ?? []);

  const result = db
    .prepare(
      `INSERT INTO posts (user_id, title, slug, content_md, tags, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`
    )
    .run(userId, input.title, slug, input.content ?? '', tagsJson);

  return getPost(userId, Number(result.lastInsertRowid))!;
}

export function getPost(userId: number, id: number): Post | null {
  const row = db
    .prepare(`SELECT * FROM posts WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Post | undefined;
  return row ?? null;
}

export function listPosts(
  userId: number,
  status?: PostStatus,
  limit = 50
): Post[] {
  if (status) {
    return db
      .prepare(
        `SELECT * FROM posts WHERE user_id = ? AND status = ?
         ORDER BY updated_at DESC LIMIT ?`
      )
      .all(userId, status, limit) as unknown as Post[];
  }
  return db
    .prepare(
      `SELECT * FROM posts WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`
    )
    .all(userId, limit) as unknown as Post[];
}

export function updatePost(
  userId: number,
  id: number,
  patch: { title?: string; content?: string; tags?: string[] }
): Post | null {
  const existing = getPost(userId, id);
  if (!existing) return null;

  const title = patch.title ?? existing.title;
  const content = patch.content ?? existing.content_md;
  const tags = patch.tags ? JSON.stringify(patch.tags) : existing.tags;
  const slug =
    patch.title && patch.title !== existing.title
      ? uniqueSlug(userId, slugify(patch.title), id)
      : existing.slug;

  db.prepare(
    `UPDATE posts SET title = ?, content_md = ?, tags = ?, slug = ?,
       updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(title, content, tags, slug, id, userId);

  return getPost(userId, id);
}

export function deletePost(userId: number, id: number): boolean {
  const result = db
    .prepare(`DELETE FROM posts WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  return result.changes > 0;
}

/**
 * Publish a draft immediately. PRD §13 flags "agent might publish when the
 * user only meant to review" as a risk — the confirmation step belongs in
 * the MCP tool description / dashboard button copy, not here; this function
 * assumes confirmation already happened and just performs the state change.
 */
export function publishPost(userId: number, id: number): Post | null {
  const existing = getPost(userId, id);
  if (!existing) return null;

  db.prepare(
    `UPDATE posts SET status = 'published', published_at = datetime('now'),
       updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(id, userId);

  return getPost(userId, id);
}

export function unpublishPost(userId: number, id: number): Post | null {
  const existing = getPost(userId, id);
  if (!existing) return null;

  db.prepare(
    `UPDATE posts SET status = 'draft', published_at = NULL,
       updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(id, userId);

  return getPost(userId, id);
}

// --- v1 (post-MVP per PRD §12 roadmap) ---
// schedule_post, manage_seo, get_analytics are intentionally not implemented
// here yet. The columns they need (scheduled_at, meta_title, meta_description,
// analytics_events) already exist in the schema (see migrations/001_init.sql)
// so v1 is additive, not a redesign.
