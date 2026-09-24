import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as posts from '../services/posts.js';
import { db } from '../db/index.js';

// Every tool call is scoped to the authenticated user (PRD Â§6: "there is no
// `user_id` parameter; it's derived from the MCP connection's API key"). We
// enforce that by building a brand-new McpServer per HTTP request, closing
// over `userId` resolved from the URL's API key â€” no tool signature below
// ever accepts a user id as an argument, so there's no way to smuggle one in.
//
// This also matches "stateless mode" for StreamableHTTPServerTransport
// (sessionIdGenerator: undefined) â€” see mcp/http.ts. Each request gets a
// fresh Server + Transport pair; nothing about a user's session persists
// server-side between calls, which keeps multi-tenant routing simple at
// MVP scale (PRD Â§7: "one process serving all users, routed by API key").

function logToolCall(userId: number, toolName: string, success: boolean, error?: string) {
  db.prepare(
    `INSERT INTO tool_call_log (user_id, tool_name, success, error) VALUES (?, ?, ?, ?)`
  ).run(userId, toolName, success ? 1 : 0, error ?? null);
}

/** Wraps a tool handler with audit logging (PRD Â§9 auditability). */
function audited<T extends (...args: any[]) => any>(
  userId: number,
  toolName: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      logToolCall(userId, toolName, true);
      return result;
    } catch (err) {
      logToolCall(userId, toolName, false, (err as Error).message);
      throw err;
    }
  }) as T;
}

function textResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function buildMcpServerForUser(userId: number): McpServer {
  const server = new McpServer({ name: 'AgentForge', version: '0.1.0' });

  server.registerTool(
    'create_post',
    {
      title: 'Create post',
      description: 'Create a new draft blog post.',
      inputSchema: {
        title: z.string().min(1).max(300),
        content: z.string().max(200_000).optional(),
        tags: z.array(z.string()).max(20).optional(),
      },
    },
    audited(userId, 'create_post', async (args: { title: string; content?: string; tags?: string[] }) => {
      const post = posts.createPost(userId, args);
      return textResult(post);
    })
  );

  server.registerTool(
    'update_post',
    {
      title: 'Update post',
      description: 'Edit an existing post (any of title, content, tags).',
      inputSchema: {
        id: z.number().int().positive(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().max(200_000).optional(),
        tags: z.array(z.string()).max(20).optional(),
      },
    },
    audited(userId, 'update_post', async (args: { id: number; title?: string; content?: string; tags?: string[] }) => {
      const post = posts.updatePost(userId, args.id, args);
      if (!post) throw new Error(`No post with id ${args.id}`);
      return textResult(post);
    })
  );

  server.registerTool(
    'delete_post',
    {
      title: 'Delete post',
      description: 'Permanently delete a post. This cannot be undone.',
      inputSchema: { id: z.number().int().positive() },
    },
    audited(userId, 'delete_post', async (args: { id: number }) => {
      const deleted = posts.deletePost(userId, args.id);
      if (!deleted) throw new Error(`No post with id ${args.id}`);
      return textResult({ deleted: true, id: args.id });
    })
  );

  server.registerTool(
    'list_posts',
    {
      title: 'List posts',
      description: 'List posts, optionally filtered by status.',
      inputSchema: {
        status: z.enum(['draft', 'published', 'scheduled']).optional(),
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    audited(userId, 'list_posts', async (args: { status?: posts.PostStatus; limit?: number }) => {
      const result = posts.listPosts(userId, args.status, args.limit ?? 50);
      return textResult(result);
    })
  );

  server.registerTool(
    'get_post',
    {
      title: 'Get post',
      description: 'Fetch the full content of one post.',
      inputSchema: { id: z.number().int().positive() },
    },
    audited(userId, 'get_post', async (args: { id: number }) => {
      const post = posts.getPost(userId, args.id);
      if (!post) throw new Error(`No post with id ${args.id}`);
      return textResult(post);
    })
  );

  server.registerTool(
    'publish_post',
    {
      title: 'Publish post',
      description:
        'Publish a draft immediately, making it publicly visible. ' +
        'Only call this after the user has explicitly confirmed they want ' +
        'to publish now (PRD Â§13: agents should not publish on an ambiguous request).',
      inputSchema: { id: z.number().int().positive() },
    },
    audited(userId, 'publish_post', async (args: { id: number }) => {
      const post = posts.publishPost(userId, args.id);
      if (!post) throw new Error(`No post with id ${args.id}`);
      return textResult(post);
    })
  );

  server.registerTool(
    'unpublish_post',
    {
      title: 'Unpublish post',
      description: 'Revert a published post back to draft.',
      inputSchema: { id: z.number().int().positive() },
    },
    audited(userId, 'unpublish_post', async (args: { id: number }) => {
      const post = posts.unpublishPost(userId, args.id);
      if (!post) throw new Error(`No post with id ${args.id}`);
      return textResult(post);
    })
  );

  // schedule_post, manage_seo, get_analytics: v1 per PRD Â§12 roadmap.
  // Not registered yet â€” an agent calling them will get a normal
  // "unknown tool" error, which is correct behavior for an MVP surface.

  return server;
}

