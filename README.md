# AgentForge

An MCP-native blogging platform. No dashboard-first CMS â€” every user gets a
personal MCP URL they drop into their IDE, and blog management happens as
natural-language requests to their coding agent. A plain web dashboard and a
read-only public blog sit on the same backend as a second and third front
door. See `PRD-ai-blog-mcp-platform.md` for the full spec this scaffold
implements.

## What's here (MVP, per PRD Â§12 roadmap)

- **MCP server** (`src/mcp/`) â€” `create_post`, `update_post`, `delete_post`,
  `list_posts`, `get_post`, `publish_post`, `unpublish_post`, served over
  Streamable HTTP in stateless mode at `POST /mcp/:apiKey`.
- **Dashboard** (`src/dashboard/`) â€” signup/login, post list/editor, publish
  controls, API key rotate/revoke. Server-rendered, no client JS framework.
- **Public blog** (`src/public/`) â€” read-only, no auth, at `/u/:userId` and
  `/u/:userId/:slug`.
- **Shared backend layer** (`src/services/`) â€” the MCP tools, dashboard, and
  public site all read/write through this, not their own logic (PRD Â§7).
- **SQLite via `node:sqlite`**, versioned migrations (`src/db/migrations/`),
  health check at `/health`, single Dockerfile, all config via env vars.

## Not yet built (v1, per PRD Â§12)

`schedule_post`, `manage_seo`, `get_analytics` â€” as both MCP tools and
dashboard screens. The schema already has the columns/table they need
(`scheduled_at`, `meta_title`, `meta_description`, `analytics_events`), so
this is additive work, not a redesign. `analytics_events` rows are already
being written on every public post view.

Also deferred, explicitly out of scope per PRD non-goals: WYSIWYG editing,
multi-author workspaces, a plugin/theme marketplace, a mobile app. Markdown
is rendered as preformatted text on the public page for now â€” swap in a
Markdown parser (e.g. `marked`) when that matters more than shipping.

## Local setup

```bash
npm install
cp .env.example .env          # then edit as needed
npm run build
node --env-file=.env --experimental-sqlite dist/server.js
```

Or for iteration: `npm run dev` (uses `tsx watch`, reads env from your shell â€”
export the vars from `.env.example` first, or use `node --env-file`).

Migrations run automatically on startup (`runMigrations()` in `server.ts`).
To run them standalone: `npm run migrate`.

Then:

1. Visit `http://localhost:3000/signup`, create an account. You'll be shown
   your MCP URL exactly once â€” copy it.
2. Add it to your IDE's MCP config, e.g. for Claude Code:
   ```json
   { "mcpServers": { "AgentForge": { "url": "http://localhost:3000/mcp/qk_..." } } }
   ```
3. Ask your agent to draft and publish a post. Check it at
   `http://localhost:3000/u/1` and in the dashboard at `/posts`.

## Docker

```bash
docker build -t AgentForge .
docker run -p 3000:3000 \
  -v AgentForge_data:/app/data \
  -e AgentForge_DB_PATH=/app/data/AgentForge.db \
  -e AgentForge_BASE_URL=https://your-domain.example \
  -e AgentForge_SESSION_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" \
  AgentForge
```

The volume is what makes data survive redeploys (PRD Â§11) â€” don't skip `-v`.

## Operational notes (read before deploying for real)

- **Never log the MCP URL path.** It contains the raw API key. If you add
  request logging (morgan, etc.), configure it to redact the `:apiKey`
  segment of `/mcp/:apiKey` routes â€” this scaffold deliberately has *no*
  request logger for that reason (see `src/mcp/http.ts`).
- **Set a real `AgentForge_SESSION_SECRET`.** `config.ts` throws on boot in
  production if it's still the dev fallback.
- **Auditability**: every tool call is logged to `tool_call_log` (user, tool,
  success/fail, timestamp) â€” PRD Â§9. Nothing reads that table yet; it's there
  for when someone needs to answer "why did my agent do that."
- **Isolation**: every service function in `src/services/` takes `userId`
  explicitly and filters every query by it. No function anywhere accepts a
  raw `user_id` from tool/form input â€” this is the enforcement point for
  PRD Â§9's isolation requirement, so any new tool or route should follow the
  same shape.

## Path to Postgres (PRD Â§7, Â§13)

`node:sqlite` was chosen deliberately for the MVP (zero external services,
no native build step). The migration files in `src/db/migrations/` are
plain SQL and mostly Postgres-compatible already; `src/db/index.ts` is the
only file that imports `node:sqlite` directly, so swapping it for a `pg`
client is a contained change, not a rewrite of `services/`.

