import express from 'express';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { mcpRouter } from './mcp/http.js';
import { dashboardRouter } from './dashboard/routes.js';
import { publicRouter } from './public/routes.js';
import { sessionMiddleware } from './middleware/session.js';

// PRD Â§11: "Single deployable process: the MCP HTTP endpoint, the dashboard,
// and the public blog are served by one Node process â€” one thing to deploy,
// one thing to scale."

runMigrations();

const app = express();
app.disable('x-powered-by');

// MCP endpoint: needs raw-parsed JSON bodies, no session cookie (auth is the
// API key in the URL path, not a cookie â€” PRD Â§9 two-credential design).
// Mounted before the session middleware so MCP traffic never touches cookies.
app.use(express.json({ limit: '2mb' }));
app.use(mcpRouter);

// Everything below this line is browser-facing and gets a session cookie.
app.use(sessionMiddleware);
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(dashboardRouter);
app.use(publicRouter);

app.listen(config.port, () => {
  console.log(`AgentForge listening on http://localhost:${config.port}`);
  console.log(`MCP URLs are issued at signup as ${config.baseUrl}/mcp/{apiKey}`);
});

