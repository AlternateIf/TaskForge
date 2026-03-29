import { db, projectMembers } from '@taskforge/db';
import { and, eq } from 'drizzle-orm';
import type { WebSocket } from 'ws';

export interface ClientConnection {
  ws: WebSocket;
  userId: string;
  channels: Set<string>;
}

export interface RealtimeEvent {
  type: string;
  channel: string;
  timestamp: string;
  data: unknown;
}

const MAX_CONNECTIONS_PER_USER = 5;

/** channel -> set of connections subscribed */
const channelSubscriptions = new Map<string, Set<ClientConnection>>();

/** userId -> set of connections */
const userConnections = new Map<string, Set<ClientConnection>>();

/** SSE response writers keyed by a unique id */
export interface SseClient {
  id: string;
  userId: string;
  channels: Set<string>;
  write: (event: RealtimeEvent) => void;
  close: () => void;
}

const sseClients = new Map<string, SseClient>();

// --- Connection management ---

export function canConnect(userId: string): boolean {
  const conns = userConnections.get(userId);
  return !conns || conns.size < MAX_CONNECTIONS_PER_USER;
}

export function addConnection(conn: ClientConnection): void {
  let conns = userConnections.get(conn.userId);
  if (!conns) {
    conns = new Set();
    userConnections.set(conn.userId, conns);
  }
  conns.add(conn);
}

export function removeConnection(conn: ClientConnection): void {
  // Unsubscribe from all channels
  for (const channel of conn.channels) {
    const subs = channelSubscriptions.get(channel);
    if (subs) {
      subs.delete(conn);
      if (subs.size === 0) channelSubscriptions.delete(channel);
    }
  }
  conn.channels.clear();

  const conns = userConnections.get(conn.userId);
  if (conns) {
    conns.delete(conn);
    if (conns.size === 0) userConnections.delete(conn.userId);
  }
}

// --- Channel authorization ---

/**
 * Verifies the user has access to the requested channel.
 * - `user:<id>` channels: only the owner can subscribe
 * - `project:<id>` channels: must be a project member
 */
export async function authorizeChannel(userId: string, channel: string): Promise<boolean> {
  const [type, id] = channel.split(':');

  if (type === 'user') {
    // Users can only subscribe to their own channel
    return id === userId;
  }

  if (type === 'project') {
    // Verify project membership
    const membership = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)))
      .limit(1);
    return membership.length > 0;
  }

  return false;
}

// --- Channel subscriptions ---

export function subscribe(conn: ClientConnection, channel: string): void {
  conn.channels.add(channel);
  let subs = channelSubscriptions.get(channel);
  if (!subs) {
    subs = new Set();
    channelSubscriptions.set(channel, subs);
  }
  subs.add(conn);
}

export function unsubscribe(conn: ClientConnection, channel: string): void {
  conn.channels.delete(channel);
  const subs = channelSubscriptions.get(channel);
  if (subs) {
    subs.delete(conn);
    if (subs.size === 0) channelSubscriptions.delete(channel);
  }
}

// --- SSE client management ---

export function addSseClient(client: SseClient): void {
  sseClients.set(client.id, client);
}

export function removeSseClient(id: string): void {
  sseClients.delete(id);
}

// --- Broadcasting ---

export function broadcast(event: RealtimeEvent): void {
  const { channel } = event;
  const payload = JSON.stringify(event);

  // WebSocket clients
  const subs = channelSubscriptions.get(channel);
  if (subs) {
    for (const conn of subs) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(payload);
      }
    }
  }

  // SSE clients
  for (const client of sseClients.values()) {
    if (client.channels.has(channel)) {
      client.write(event);
    }
  }
}

// --- Utilities ---

export function getConnectionCount(userId: string): number {
  return userConnections.get(userId)?.size ?? 0;
}

export function getAllConnections(): ClientConnection[] {
  const all: ClientConnection[] = [];
  for (const conns of userConnections.values()) {
    for (const conn of conns) all.push(conn);
  }
  return all;
}

export function clearAll(): void {
  channelSubscriptions.clear();
  userConnections.clear();
  sseClients.clear();
}
