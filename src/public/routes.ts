import { Router } from 'express';
import { marked } from 'marked';
import { db } from '../db/index.js';
import { escapeHtml, layout } from '../dashboard/views/layout.js';

// Public read-only blog.
// Published posts are rendered as proper articles.
// Editing/unpublishing remains protected by the dashboard routes.

export const publicRouter = Router();

interface PublicUser {
  id: number;
  email: string;
}

interface PublicPost {
  id: number;
  title: string;
  slug: string;
  content_md: string;
  published_at: string;
}

function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;
}

function publicBlogStyles(): string {
  return `
    <style>
      .public-blog {
        max-width: 820px;
        margin: 0 auto;
      }

      .blog-header {
        margin-bottom: 36px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--border);
      }

      .blog-brand {
        display: inline-block;
        margin-bottom: 18px;
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .blog-header h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 5vw, 3.2rem);
        line-height: 1.1;
      }

      .blog-meta {
        color: var(--muted);
        font-size: 0.92rem;
      }

      .blog-content {
        color: var(--text-secondary);
        font-size: 1.04rem;
        line-height: 1.85;
      }

      .blog-content h1,
      .blog-content h2,
      .blog-content h3,
      .blog-content h4 {
        color: var(--text);
        line-height: 1.25;
        margin-top: 2em;
        margin-bottom: 0.7em;
      }

      .blog-content h1 {
        font-size: 2rem;
      }

      .blog-content h2 {
        font-size: 1.55rem;
      }

      .blog-content h3 {
        font-size: 1.25rem;
      }

      .blog-content p {
        margin: 0 0 1.25em;
      }

      .blog-content a {
        color: var(--accent-hover);
        text-decoration: underline;
        text-decoration-color: rgba(146, 120, 255, 0.4);
        text-underline-offset: 3px;
      }

      .blog-content a:hover {
        color: white;
        text-decoration-color: var(--accent-hover);
      }

      .blog-content strong {
        color: var(--text);
        font-weight: 750;
      }

      .blog-content em {
        color: var(--text-secondary);
      }

      .blog-content ul,
      .blog-content ol {
        margin: 0 0 1.4em;
        padding-left: 1.7rem;
      }

      .blog-content li {
        margin-bottom: 0.45em;
      }

      .blog-content blockquote {
        margin: 1.5em 0;
        padding: 14px 20px;
        color: var(--text-secondary);
        background: var(--surface);
        border-left: 3px solid var(--accent);
        border-radius: 0 var(--radius-small) var(--radius-small) 0;
      }

      .blog-content blockquote p:last-child {
        margin-bottom: 0;
      }

      .blog-content code {
        color: #ddd7ff;
        background: #080c16;
      }

      .blog-content pre {
        margin: 1.5em 0;
        padding: 18px;
        overflow-x: auto;
        background: #070b13;
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }

      .blog-content pre code {
        padding: 0;
        color: var(--text-secondary);
        background: transparent;
        border: 0;
      }

      .blog-content hr {
        margin: 2.5em 0;
      }

      .blog-content img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1.5em auto;
        border-radius: var(--radius);
        border: 1px solid var(--border);
      }

      .blog-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 12px;
      }

      .blog-list-item {
        padding: 18px 20px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        transition:
          transform 0.15s ease,
          border-color 0.15s ease,
          background 0.15s ease;
      }

      .blog-list-item:hover {
        transform: translateY(-1px);
        background: var(--surface-hover);
        border-color: var(--accent);
      }

      .blog-list-item a {
        display: block;
        color: var(--text);
        font-weight: 700;
        font-size: 1.05rem;
      }

      .blog-list-item .muted {
        display: block;
        margin-top: 4px;
      }

      .back-link {
        display: inline-block;
        margin-bottom: 24px;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .back-link:hover {
        color: var(--text);
      }

      /* Bottom article actions */

      .article-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 48px;
        padding-top: 20px;
        border-top: 1px solid var(--border);
      }

      .article-actions a,
      .article-actions button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        padding: 7px 13px;
        border: 1px solid var(--border);
        border-radius: 7px;
        background: var(--surface);
        color: var(--muted);
        font: inherit;
        font-size: 0.82rem;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition:
          background 0.15s ease,
          border-color 0.15s ease,
          color 0.15s ease;
      }

      .article-actions a:hover,
      .article-actions button:hover {
        background: var(--surface-hover);
        border-color: var(--accent);
        color: var(--text);
      }

      .article-actions .unpublish-button:hover {
        border-color: #d97706;
        color: #f59e0b;
      }

      .article-actions .delete-button:hover {
        border-color: #dc2626;
        color: #ef4444;
      }

      .article-actions form {
        margin: 0;
      }

      @media (max-width: 700px) {
        .blog-content {
          font-size: 1rem;
        }

        .blog-header h1 {
          font-size: 2rem;
        }

        .article-actions {
          flex-wrap: wrap;
        }
      }
    </style>
  `;
}

publicRouter.get('/u/:userId', (req, res) => {
  const user = db
    .prepare(`SELECT id, email FROM users WHERE id = ?`)
    .get(Number(req.params.userId)) as PublicUser | undefined;

  if (!user) {
    res
      .status(404)
      .send(layout('Not found', '<p>No such blog.</p>', false));
    return;
  }

  const posts = db
    .prepare(
      `SELECT id, title, slug, published_at FROM posts
       WHERE user_id = ? AND status = 'published'
       ORDER BY published_at DESC`
    )
    .all(user.id) as unknown as PublicPost[];

  const list = posts
    .map(
      (p) => `
        <li class="blog-list-item">
          <a href="/u/${user.id}/${encodeURIComponent(p.slug)}">
            ${escapeHtml(p.title)}
          </a>

          <span class="muted">
            ${new Date(p.published_at).toLocaleDateString()}
          </span>
        </li>
      `
    )
    .join('');

  res.send(
    layout(
      `${user.email}'s blog`,
      `
        ${publicBlogStyles()}

        <main class="public-blog">
          <header class="blog-header">
            <span class="blog-brand">AgentForge</span>

            <h1>${escapeHtml(user.email)}'s blog</h1>

            <p class="blog-meta">Published articles</p>
          </header>

          ${
            posts.length
              ? `<ul class="blog-list">${list}</ul>`
              : '<p class="muted">No posts published yet.</p>'
          }
        </main>
      `,
      false
    )
  );
});

publicRouter.get('/u/:userId/:slug', (req, res) => {
  const userId = Number(req.params.userId);

  const post = db
    .prepare(
      `SELECT id, title, slug, content_md, published_at FROM posts
       WHERE user_id = ? AND slug = ? AND status = 'published'`
    )
    .get(userId, req.params.slug) as PublicPost | undefined;

  if (!post) {
    res
      .status(404)
      .send(layout('Not found', '<p>No such post.</p>', false));
    return;
  }

  db.prepare(
    `INSERT INTO analytics_events (post_id, event_type, referrer)
     VALUES (?, 'view', ?)`
  ).run(post.id, req.get('referer') ?? null);

  const renderedContent = renderMarkdown(post.content_md);

  res.send(
    layout(
      post.title,
      `
        ${publicBlogStyles()}

        <main class="public-blog">
    

          <a class="back-link" href="/posts">
            ← Back to blog
          </a>

          <article>
            <header class="blog-header">
              <span class="blog-brand">AgentForge</span>

              <h1>${escapeHtml(post.title)}</h1>

              <p class="blog-meta">
                Published
                ${new Date(post.published_at).toLocaleDateString()}
              </p>
            </header>

            <div class="blog-content">
              ${renderedContent}
            </div>

            <div class="article-actions">

              <a href="/posts/${post.id}">
                Edit
              </a>

              <form
                method="post"
                action="/posts/${post.id}/unpublish"
                onsubmit="return confirm('Unpublish this post? It will no longer be publicly visible.');"
              >
                <button
                  type="submit"
                  class="unpublish-button"
                >
                  Unpublish
                </button>
              </form>

              <form
                method="post"
                action="/posts/${post.id}/delete"
                onsubmit="return confirm('Delete this post permanently?');"
              >
                <button
                  type="submit"
                  class="delete-button"
                >
                  Delete
                </button>
              </form>

            </div>
          </article>

        </main>
      `,
      false
    )
  );
});