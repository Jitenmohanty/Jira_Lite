import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { memberships } from '../db/schema';
import { env } from '../config/env';
import { verifyToken } from '../lib/jwt';
import { AUTH_COOKIE } from '../lib/cookies';
import { logger } from '../lib/logger';
import { setIo } from './emit';

/** Minimal cookie-header parser (avoids a dep just for the handshake). */
function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    if (part.slice(0, eqIdx).trim() === name) {
      return decodeURIComponent(part.slice(eqIdx + 1).trim());
    }
  }
  return undefined;
}

/**
 * Attaches a Socket.IO server that authenticates via the same HTTP-only auth
 * cookie as the REST API, then joins each client to a personal room and one
 * room per org they belong to. Services broadcast through `emit.ts`.
 */
export function setupRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, AUTH_COOKIE);
      if (!token) return next(new Error('unauthorized'));
      socket.data.userId = verifyToken(token).sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    try {
      const rows = await db
        .select({ orgId: memberships.orgId })
        .from(memberships)
        .where(eq(memberships.userId, userId));
      for (const r of rows) socket.join(`org:${r.orgId}`);
      logger.debug({ userId, orgs: rows.length }, 'socket connected');
    } catch (err) {
      logger.warn({ err }, 'socket room join failed');
    }
  });

  setIo(io);
  return io;
}
