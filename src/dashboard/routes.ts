import { Router } from 'express';
import { layout, escapeHtml } from './views/layout.js';
import { signup, login } from '../services/users.js';
import * as posts from '../services/posts.js';
import {
  createApiKey,
  revokeApiKey,
  listApiKeysForUser,
} from '../auth/apiKey.js';
import { requireLogin } from '../middleware/session.js';
import { config } from '../config.js';

export const dashboardRouter = Router();

function userId(req: import('express').Request): number {
  return (req as any).userId as number;
}

// ---- Auth ----

dashboardRouter.get('/signup', (_req, res) => {
  res.send(
    layout(
      'Sign up',
      `<h1>Create your AgentForge account</h1>
       <form method="post" action="/signup">
         <label>Email<input type="email" name="email" required></label>
         <label>Password<input type="password" name="password" minlength="8" required></label>
         <button type="submit">Sign up</button>
       </form>
       <p class="muted">Already have an account? <a href="/login">Log in</a></p>`,
      false
    )
  );
});

dashboardRouter.post('/signup', (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    password.length < 8
  ) {
    res
      .status(400)
      .send(
        layout(
          'Sign up',
          `<p class="danger">Invalid email or password (min 8 chars).</p>
           <a href="/signup">Back</a>`,
          false
        )
      );
    return;
  }

  try {
    const result = signup(email, password);
    req.session!.userId = result.user.id;

    res.send(
      layout(
        'Welcome',
        `<h1>Account created</h1>
         <p>Your MCP URL — add this to your IDE's MCP config. It won't be shown again:</p>
         <p><code>${escapeHtml(config.baseUrl)}/mcp/${escapeHtml(result.apiKey.rawKey)}</code></p>
         <p class="muted">If you lose it, rotate it from <a href="/account">Account settings</a>.</p>
         <a href="/posts">Go to my posts →</a>`
      )
    );
  } catch (err) {
    res
      .status(400)
      .send(
        layout(
          'Sign up',
          `<p class="danger">${escapeHtml((err as Error).message)}</p>
           <a href="/signup">Back</a>`,
          false
        )
      );
  }
});

dashboardRouter.get('/login', (_req, res) => {
  res.send(
    layout(
      'Log in',
      `<h1>Log in to AgentForge</h1>
       <form method="post" action="/login">
         <label>Email<input type="email" name="email" required></label>
         <label>Password<input type="password" name="password" required></label>
         <button type="submit">Log in</button>
       </form>
       <p class="muted">New here? <a href="/signup">Sign up</a></p>`,
      false
    )
  );
});

dashboardRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};

  const id =
    typeof email === 'string' && typeof password === 'string'
      ? login(email, password)
      : null;

  if (!id) {
    res
      .status(401)
      .send(
        layout(
          'Log in',
          `<p class="danger">Invalid email or password.</p>
           <a href="/login">Back</a>`,
          false
        )
      );
    return;
  }

  req.session!.userId = id;
  res.redirect('/posts');
});

dashboardRouter.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// ---- Posts ----

dashboardRouter.get('/posts', requireLogin, (req, res) => {
  const currentUserId = userId(req);
  const all = posts.listPosts(currentUserId, undefined, 200);

  const rows = all
    .map((p) => {
      /*
       * Published posts open as public articles.
       * Draft posts continue to open in the editor.
       */
      const postUrl =
        p.status === 'published'
          ? `/u/${currentUserId}/${encodeURIComponent(p.slug)}`
          : `/posts/${p.id}`;

      return `
        <tr>
          <td>
            <a href="${postUrl}">
              ${escapeHtml(p.title)}
            </a>
          </td>

          <td>
            <span class="status">
              ${escapeHtml(p.status)}
            </span>
          </td>

          <td class="muted">
            ${new Date(p.updated_at).toLocaleString()}
          </td>
        </tr>
      `;
    })
    .join('');

  res.send(
    layout(
      'Posts',
      `<h1>Posts</h1>

       ${
         all.length === 0
           ? `<p class="muted">
                No posts yet.
                <a href="/posts/new">Write your first one</a>.
              </p>`
           : `<table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>

                <tbody>
                  ${rows}
                </tbody>
              </table>`
       }`
    )
  );
});

dashboardRouter.get('/posts/new', requireLogin, (_req, res) => {
  res.send(
    layout(
      'New post',
      `<h1>New post</h1>

       <form method="post" action="/posts">
         <label>
           Title
           <input
             type="text"
             name="title"
             required
           >
         </label>

         <label>
           Tags (comma-separated)
           <input
             type="text"
             name="tags"
           >
         </label>

         <label>
           Content (Markdown)
           <textarea name="content"></textarea>
         </label>

         <button type="submit">
           Save draft
         </button>
       </form>`
    )
  );
});

dashboardRouter.post('/posts', requireLogin, (req, res) => {
  const { title, content, tags } = req.body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    res
      .status(400)
      .send(
        layout(
          'New post',
          `<p class="danger">Title is required.</p>
           <a href="/posts/new">Back</a>`
        )
      );
    return;
  }

  const tagList =
    typeof tags === 'string' && tags.trim()
      ? tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  const post = posts.createPost(userId(req), {
    title,
    content,
    tags: tagList,
  });

  res.redirect(`/posts/${post.id}`);
});

// ---- Post editor ----

dashboardRouter.get('/posts/:id', requireLogin, (req, res) => {
  const currentUserId = userId(req);
  const post = posts.getPost(currentUserId, Number(req.params.id));

  if (!post) {
    res
      .status(404)
      .send(
        layout(
          'Not found',
          `<p>No such post.</p>
           <a href="/posts">Back to posts</a>`
        )
      );
    return;
  }

  const tags: string[] = JSON.parse(post.tags || '[]');

  const publicArticleUrl =
    `/u/${currentUserId}/${encodeURIComponent(post.slug)}`;

  res.send(
    layout(
      post.title,
      `<h1>Edit post</h1>

       <p class="row">
         <span class="status">
           ${escapeHtml(post.status)}
         </span>

         <span class="muted">
           /${escapeHtml(post.slug)}
         </span>
       </p>

       <form method="post" action="/posts/${post.id}">
         <label>
           Title
           <input
             type="text"
             name="title"
             value="${escapeHtml(post.title)}"
             required
           >
         </label>

         <label>
           Tags (comma-separated)
           <input
             type="text"
             name="tags"
             value="${escapeHtml(tags.join(', '))}"
           >
         </label>

         <label>
           Content (Markdown)
           <textarea name="content">${escapeHtml(post.content_md)}</textarea>
         </label>

         <button type="submit">
           Save changes
         </button>
       </form>

       <div class="row">

         ${
           post.status === 'published'
             ? `
               <a href="${publicArticleUrl}">
                 <button type="button">
                   View published article
                 </button>
               </a>

               <form
                 method="post"
                 action="/posts/${post.id}/unpublish"
                 onsubmit="return confirm('Unpublish this post? It will no longer be publicly visible.');"
               >
                 <button type="submit">
                   Unpublish
                 </button>
               </form>
             `
             : `
               <form
                 method="post"
                 action="/posts/${post.id}/publish"
                 onsubmit="return confirm('Publish this post now? It will become publicly visible.');"
               >
                 <button type="submit">
                   Publish now
                 </button>
               </form>
             `
         }

         <form
           method="post"
           action="/posts/${post.id}/delete"
           onsubmit="return confirm('Delete this post permanently?');"
         >
           <button
             type="submit"
             class="danger"
           >
             Delete
           </button>
         </form>

       </div>`
    )
  );
});

dashboardRouter.post('/posts/:id', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const { title, content, tags } = req.body ?? {};

  const tagList =
    typeof tags === 'string'
      ? tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

  const updated = posts.updatePost(userId(req), id, {
    title,
    content,
    tags: tagList,
  });

  if (!updated) {
    res
      .status(404)
      .send(
        layout(
          'Not found',
          `<p>No such post.</p>
           <a href="/posts">Back</a>`
        )
      );
    return;
  }

  // Editing always returns to the editor.
  res.redirect(`/posts/${id}`);
});

// ---- Publish ----

dashboardRouter.post('/posts/:id/publish', requireLogin, (req, res) => {
  const id = Number(req.params.id);

  const updated = posts.publishPost(userId(req), id);

  if (!updated) {
    res.status(404).end();
    return;
  }

  /*
   * Important:
   * Do NOT automatically open the public article.
   * Return to Posts so the user can see the Published status
   * and click the article themselves.
   */
  res.redirect('/posts');
});

// ---- Unpublish ----

dashboardRouter.post('/posts/:id/unpublish', requireLogin, (req, res) => {
  const id = Number(req.params.id);

  const updated = posts.unpublishPost(userId(req), id);

  if (!updated) {
    res.status(404).end();
    return;
  }

  /*
   * After unpublishing, return to the editor.
   * The post is no longer publicly visible.
   */
  res.redirect(`/posts/${id}`);
});

// ---- Delete ----

dashboardRouter.post('/posts/:id/delete', requireLogin, (req, res) => {
  posts.deletePost(userId(req), Number(req.params.id));

  res.redirect('/posts');
});

// ---- Account ----

dashboardRouter.get('/account', requireLogin, (req, res) => {
  const keys = listApiKeysForUser(userId(req)) as {
    id: number;
    key_prefix: string;
    created_at: string;
    revoked_at: string | null;
  }[];

  const rows = keys
    .map(
      (k) => `<tr>
        <td>
          <code>${escapeHtml(k.key_prefix)}…</code>
        </td>

        <td class="muted">
          ${new Date(k.created_at).toLocaleString()}
        </td>

        <td>
          ${
            k.revoked_at
              ? '<span class="status danger">revoked</span>'
              : '<span class="status">active</span>'
          }
        </td>

        <td>
          ${
            !k.revoked_at
              ? `<form
                   class="inline"
                   method="post"
                   action="/account/keys/${k.id}/revoke"
                   onsubmit="return confirm('Revoke this key? Any IDE using it will lose access immediately.');"
                 >
                   <button type="submit">
                     Revoke
                   </button>
                 </form>`
              : ''
          }
        </td>
      </tr>`
    )
    .join('');

  res.send(
    layout(
      'Account',
      `<h1>Account</h1>

       <h2>MCP API keys</h2>

       <table>
         <thead>
           <tr>
             <th>Key</th>
             <th>Created</th>
             <th>Status</th>
             <th></th>
           </tr>
         </thead>

         <tbody>
           ${rows}
         </tbody>
       </table>

       <form method="post" action="/account/keys">
         <button type="submit">
           Generate new key
         </button>
       </form>

       <p class="muted">
         Generating a new key does not revoke old ones —
         revoke leaked keys explicitly above.
       </p>`
    )
  );
});

dashboardRouter.post('/account/keys', requireLogin, (req, res) => {
  const created = createApiKey(userId(req));

  res.send(
    layout(
      'New API key',
      `<h1>New MCP URL</h1>

       <p>This key won't be shown again — copy it now:</p>

       <p>
         <code>
           ${escapeHtml(config.baseUrl)}/mcp/${escapeHtml(created.rawKey)}
         </code>
       </p>

       <a href="/account">
         Back to account
       </a>`
    )
  );
});

dashboardRouter.post(
  '/account/keys/:id/revoke',
  requireLogin,
  (req, res) => {
    revokeApiKey(Number(req.params.id), userId(req));

    res.redirect('/account');
  }
);

dashboardRouter.get('/', requireLogin, (_req, res) => {
  res.redirect('/posts');
});