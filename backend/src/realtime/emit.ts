import type { Server } from 'socket.io';

// Decoupled emitters so services can broadcast without importing the io server.
let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

/** Notify all members of an org that an issue changed (create/update/delete). */
export function emitIssueChanged(orgId: string, projectId: string, issueId: string): void {
  io?.to(`org:${orgId}`).emit('issue:changed', { projectId, issueId });
}

/** Notify a single user that they have a new in-app notification. */
export function emitNotification(userId: string): void {
  io?.to(`user:${userId}`).emit('notification:new', {});
}
