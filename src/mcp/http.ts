import { Router, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { resolveApiKey } from '../auth/apiKey.js';
import { buildMcpServerForUser } from './server.js';

// PRD Â§7: "one process serving all users (routed by API key in the URL)".
// A user's MCP URL is:  {AgentForge_BASE_URL}/mcp/{apiKey}
//
// PRD Â§13 key-leakage requirement: never log the raw key. We deliberately
// avoid logging req.url/req.originalUrl anywhere near this router, and
// Express's default request logging (if added later) MUST be configured to
// redact the :apiKey path segment â€” see README "Operational notes".

export const mcpRouter = Router();

mcpRouter.post('/mcp/:apiKey', async (req: Request, res: Response) => {
  const auth = resolveApiKey(req.params.apiKey);
  if (!auth) {
    res.status(401).json({ error: 'Invalid or revoked API key.' });
    return;
  }

  // Stateless mode: fresh Server + Transport per request. Simple and
  // correct for MVP scale; revisit only if per-connection session state
  // (e.g. long-lived streaming) becomes a real requirement (PRD Â§9 latency
  // note already assumes short-lived tool calls).
  const server = buildMcpServerForUser(auth.userId);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// GET/DELETE on the MCP endpoint aren't meaningful in stateless mode.
mcpRouter.get('/mcp/:apiKey', (_req, res) => {
  res.status(405).json({ error: 'Method not allowed in stateless MCP mode.' });
});

