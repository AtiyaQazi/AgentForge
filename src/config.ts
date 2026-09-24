// All runtime config comes from environment variables (PRD Â§11 â€” no hardcoded config).
// A .env file is NOT auto-loaded here to keep the server dependency-light; use your
// process manager / Docker env / `node --env-file=.env` (Node 22+) to supply these.

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const config = {
  // Where the SQLite file lives. In Docker this should point at a mounted volume
  // (see docker-compose.yml / Dockerfile comments) so data survives redeploys.
  dbPath: required('AgentForge_DB_PATH', './data/AgentForge.db'),

  // Port the single Node process listens on for MCP + dashboard + public site.
  port: parseInt(required('PORT', '3000'), 10),

  // Public base URL, used to build each user's MCP URL (e.g. https://AgentForge.app).
  baseUrl: required('AgentForge_BASE_URL', 'http://localhost:3000'),

  // Secret used to sign the dashboard's session cookie. MUST be set to a long
  // random value in production â€” this fallback is dev-only and intentionally weak.
  sessionSecret: required(
    'AgentForge_SESSION_SECRET',
    'dev-only-insecure-secret-change-me'
  ),

  isProduction: process.env.NODE_ENV === 'production',
};

if (config.isProduction && config.sessionSecret === 'dev-only-insecure-secret-change-me') {
  throw new Error(
    'AgentForge_SESSION_SECRET must be set to a real secret in production.'
  );
}

