import cookieSession from 'cookie-session';
import type { RequestHandler } from 'express';
import { config } from '../config.js';

// Dashboard-only session cookie, signed with AgentForge_SESSION_SECRET. This is
// entirely separate from the MCP API key (PRD Â§9: "two separate credentials
// by design") â€” a leaked session cookie never grants MCP access and vice versa.
export const sessionMiddleware: RequestHandler = cookieSession({
  name: 'AgentForge_session',
  secret: config.sessionSecret,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
});

export function requireLogin(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) {
  const userId = req.session?.userId as number | undefined;
  if (!userId) {
    res.redirect('/login');
    return;
  }
  (req as any).userId = userId;
  next();
}

