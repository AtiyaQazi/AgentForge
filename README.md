# AgentForge

An MCP-native blogging platform. No dashboard-first CMS — every user gets a personal MCP URL they can connect to their IDE or coding agent, and blog management happens through natural-language requests.

A plain web dashboard and a read-only public blog use the same backend as the second and third front doors.

## What's Here

### MCP Server

The MCP server is located in `src/mcp/` and provides the following tools:

* `create_post`
* `update_post`
* `delete_post`
* `list_posts`
* `get_post`
* `publish_post`
* `unpublish_post`

The server uses Streamable HTTP in stateless mode:

```text
POST /mcp/:apiKey
```

Each user receives a personal MCP URL containing their API key.

### Dashboard

The server-rendered dashboard is located in `src/dashboard/`.

It provides:

* Signup and login
* Post list
* Draft creation and editing
* Publish and unpublish controls
* Published article access
* Post deletion
* API key rotation
* API key revocation
* Responsive dark UI

Published post titles open the public article, while draft post titles open the editor.

### Public Blog

The public blog is located in `src/public/`.

Published posts are available without authentication:

```text
/u/:userId
/u/:userId/:slug
```

The public article page:

* Renders Markdown as formatted HTML
* Uses `marked` for Markdown rendering
* Does not expose the editor textarea
* Provides a `Back to Posts` link
* Records analytics events when articles are viewed
* Provides Edit, Unpublish, and Delete controls at the bottom of the article

### Shared Backend Layer

The shared service layer is located in:

```text
src/services/
```

The MCP tools, dashboard, and public blog use this shared backend layer rather than implementing separate business logic.

Service functions receive the authenticated `userId` explicitly and scope database operations to that user.

### Database

AgentForge currently uses:

* SQLite
* Node's built-in `node:sqlite`
* Versioned SQL migrations
* Automatic migrations on startup
* Analytics event storage
* MCP tool-call audit logging
* Environment-based configuration

Database code is located in:

```text
src/db/
```

Health check:

```text
GET /health
```

## Current MVP

The current MVP includes the core MCP blogging workflow:

* User signup and login
* MCP API key management
* MCP blog tools
* Draft management
* Post editing
* Post publishing
* Post unpublishing
* Post deletion
* Server-rendered dashboard
* Public blog
* Markdown rendering
* Analytics event recording
* MCP tool-call auditing
* SQLite persistence
* Database migrations
* Docker support

## Not Yet Built

The following features are planned for a future version:

* `schedule_post`
* `manage_seo`
* `get_analytics`
* Scheduling dashboard
* SEO management dashboard
* Analytics dashboard

The database schema already contains supporting fields and tables such as:

```text
scheduled_at
meta_title
meta_description
analytics_events
```

Analytics events are already recorded when public posts are viewed.

## Out of Scope

The following features are intentionally outside the current project scope:

* WYSIWYG editing
* Multi-author workspaces
* Plugin/theme marketplace
* Native mobile application

AgentForge focuses on an MCP-native blogging workflow where an AI coding agent can manage blog content through natural-language requests.

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create the Environment File

Copy `.env.example` to `.env`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` as needed.

Example local configuration:

```env
AgentForge_DB_PATH=./data/AgentForge.db
PORT=3000
AgentForge_BASE_URL=http://localhost:3000
AgentForge_SESSION_SECRET=dev-only-insecure-secret-change-me
```

For production, replace the development session secret with a strong random value.

### 3. Build the Project

```bash
npm run build
```

The build compiles the TypeScript source and copies the database migrations into the distribution directory.

### 4. Start AgentForge

```bash
node --env-file=.env --experimental-sqlite dist/server.js
```

The application will be available at:

```text
http://localhost:3000
```

### Development Mode

For development:

```bash
npm run dev
```

Make sure the required environment variables are available in your environment.

### Database Migrations

Migrations run automatically when the server starts.

They can also be executed manually:

```bash
npm run migrate
```

## First-Time Usage

### 1. Create an Account

Open:

```text
http://localhost:3000/signup
```

Create an account and sign in.

After signup, AgentForge provides your personal MCP URL.

**Copy this URL and keep it secure.**

### 2. Connect Your MCP Client

Add your personal MCP endpoint to an MCP-compatible IDE or coding agent.

Example:

```json
{
  "mcpServers": {
    "AgentForge": {
      "url": "http://localhost:3000/mcp/qk_..."
    }
  }
}
```

The exact URL contains your personal API key.

**Do not publish or share your MCP URL.**

### 3. Manage Your Blog

Once connected, your coding agent can perform supported operations using natural-language requests.

For example:

```text
Create a new post about artificial intelligence.
```

```text
Show me my latest posts.
```

```text
Update my latest draft.
```

```text
Publish my latest post.
```

You can also manage your posts directly from the dashboard:

```text
http://localhost:3000/posts
```

### 4. View the Public Blog

Published posts are available through:

```text
http://localhost:3000/u/:userId
```

Individual articles use:

```text
http://localhost:3000/u/:userId/:slug
```

## Publishing Workflow

AgentForge separates draft editing from public article viewing.

### Draft Posts

Clicking a draft post title from the Posts dashboard opens the editor.

### Published Posts

Clicking a published post title opens the public article.

The public article is rendered as a readable blog page rather than showing the Markdown source inside an editor.

The article includes small management controls at the bottom:

* Edit
* Unpublish
* Delete

After publishing a post, AgentForge returns the user to the Posts dashboard instead of automatically opening the article.

## Markdown Rendering

AgentForge uses the `marked` package to convert Markdown content into HTML for public articles.

This means content such as:

```markdown
# My Article

This is **bold** text.

- First item
- Second item
- Third item
```

is displayed as a formatted article rather than raw Markdown source.

The public rendering logic is implemented in:

```text
src/public/routes.ts
```

## Docker

Build the Docker image:

```bash
docker build -t agentforge .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -v agentforge_data:/app/data \
  -e AgentForge_DB_PATH=/app/data/AgentForge.db \
  -e AgentForge_BASE_URL=https://your-domain.example \
  -e AgentForge_SESSION_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" \
  agentforge
```

The persistent volume is important because the SQLite database is stored inside `/app/data`.

Without the volume, database data can be lost when the container is replaced.

## Operational Notes

### Protect the MCP URL

The MCP URL contains the user's raw API key.

Never expose or publish this URL.

In particular, avoid logging requests containing:

```text
/mcp/:apiKey
```

If request logging is added in the future, the `:apiKey` portion must be redacted.

The current MCP HTTP implementation intentionally does not use a request logger for this reason.

### Session Secret

Set a strong `AgentForge_SESSION_SECRET` before deploying to production.

Do not use:

```text
dev-only-insecure-secret-change-me
```

in production.

### Auditability

MCP tool calls are recorded in:

```text
tool_call_log
```

The log records information including:

* User
* Tool name
* Success or failure
* Timestamp

This provides an audit trail for understanding which operations were performed by an agent.

### User Isolation

User isolation is enforced in the shared service layer.

Every service function receives the authenticated `userId` explicitly and scopes database queries to that user.

New MCP tools and dashboard routes should follow the same pattern.

Avoid accepting an unrestricted `user_id` directly from tool or form input.

### Analytics

Public article views are recorded in:

```text
analytics_events
```

This data is already being collected and can support the future analytics dashboard.

## Project Structure

```text
AgentForge/
├── scripts/
│   └── copy-migrations.mjs
│
├── src/
│   ├── auth/
│   │   ├── apiKey.ts
│   │   └── password.ts
│   │
│   ├── dashboard/
│   │   ├── routes.ts
│   │   └── views/
│   │       └── layout.ts
│   │
│   ├── db/
│   │   ├── index.ts
│   │   ├── migrate.ts
│   │   └── migrations/
│   │       └── 001_init.sql
│   │
│   ├── mcp/
│   │   ├── http.ts
│   │   └── server.ts
│   │
│   ├── middleware/
│   │   └── session.ts
│   │
│   ├── public/
│   │   └── routes.ts
│   │
│   ├── services/
│   │   ├── posts.ts
│   │   └── users.ts
│   │
│   ├── config.ts
│   └── server.ts
│
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```

## Path to PostgreSQL

SQLite was deliberately selected for the MVP because it provides:

* Zero external database services
* Simple local development
* Minimal deployment complexity
* No separate database server requirement

Database access is isolated primarily within:

```text
src/db/
```

The migration files are plain SQL, and the application service layer is separated from the database implementation.

This allows a future PostgreSQL migration without redesigning the MCP server, dashboard, or public blog business logic.

## Project Status

AgentForge currently provides a working MCP-native blogging platform with three interfaces:

```text
                    ┌──────────────────┐
                    │    AgentForge    │
                    │   Shared Backend  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        MCP Server       Dashboard      Public Blog
        AI Agent         Web UI         Read-only
```

The MCP server is the primary agent-facing interface, while the dashboard and public blog provide browser-based alternatives on the same backend.

## License

This project is currently provided as a personal/project implementation.
