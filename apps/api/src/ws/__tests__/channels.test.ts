import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ClientConnection,
  type RealtimeEvent,
  addConnection,
  addSseClient,
  broadcast,
  canConnect,
  clearAll,
  getConnectionCount,
  removeConnection,
  removeSseClient,
  subscribe,
  unsubscribe,
} from '../channels.js';

function mockWs(readyState = 1 /* OPEN */): ClientConnection['ws'] {
  return {
    readyState,
    OPEN: 1,
    send: vi.fn(),
    ping: vi.fn(),
    close: vi.fn(),
  } as unknown as ClientConnection['ws'];
}

function makeConn(userId: string): ClientConnection {
  return { ws: mockWs(), userId, channels: new Set() };
}

describe('channels', () => {
  beforeEach(() => {
    clearAll();
  });

  afterEach(() => {
    clearAll();
  });

  describe('connection management', () => {
    it('should allow connections up to the max per user', () => {
      const userId = 'u1';
      expect(canConnect(userId)).toBe(true);

      for (let i = 0; i < 5; i++) {
        addConnection(makeConn(userId));
      }

      expect(canConnect(userId)).toBe(false);
      expect(getConnectionCount(userId)).toBe(5);
    });

    it('should remove connection and clean up subscriptions', () => {
      const conn = makeConn('u1');
      addConnection(conn);
      subscribe(conn, 'project:p1');
      subscribe(conn, 'project:p2');

      expect(getConnectionCount('u1')).toBe(1);

      removeConnection(conn);

      expect(getConnectionCount('u1')).toBe(0);
      expect(conn.channels.size).toBe(0);
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('should subscribe to a channel', () => {
      const conn = makeConn('u1');
      addConnection(conn);
      subscribe(conn, 'project:p1');

      expect(conn.channels.has('project:p1')).toBe(true);
    });

    it('should unsubscribe from a channel', () => {
      const conn = makeConn('u1');
      addConnection(conn);
      subscribe(conn, 'project:p1');
      unsubscribe(conn, 'project:p1');

      expect(conn.channels.has('project:p1')).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('should send events to WebSocket clients subscribed to the channel', () => {
      const conn1 = makeConn('u1');
      const conn2 = makeConn('u2');
      const conn3 = makeConn('u3'); // not subscribed

      addConnection(conn1);
      addConnection(conn2);
      addConnection(conn3);

      subscribe(conn1, 'project:p1');
      subscribe(conn2, 'project:p1');
      subscribe(conn3, 'project:p2');

      const event: RealtimeEvent = {
        type: 'task.updated',
        channel: 'project:p1',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: { taskId: 't1' },
      };

      broadcast(event);

      expect(conn1.ws.send).toHaveBeenCalledWith(JSON.stringify(event));
      expect(conn2.ws.send).toHaveBeenCalledWith(JSON.stringify(event));
      expect(conn3.ws.send).not.toHaveBeenCalled();
    });

    it('should not send to WebSocket clients with closed connections', () => {
      const conn = makeConn('u1');
      (conn.ws as unknown as { readyState: number }).readyState = 3; // CLOSED
      addConnection(conn);
      subscribe(conn, 'project:p1');

      broadcast({
        type: 'task.updated',
        channel: 'project:p1',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: {},
      });

      expect(conn.ws.send).not.toHaveBeenCalled();
    });

    it('should send events to SSE clients subscribed to the channel', () => {
      const write = vi.fn();
      addSseClient({
        id: 'sse-1',
        userId: 'u1',
        channels: new Set(['project:p1']),
        write,
        close: vi.fn(),
      });

      const event: RealtimeEvent = {
        type: 'task.updated',
        channel: 'project:p1',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: { taskId: 't1' },
      };

      broadcast(event);

      expect(write).toHaveBeenCalledWith(event);
    });

    it('should not send events to SSE clients not subscribed', () => {
      const write = vi.fn();
      addSseClient({
        id: 'sse-1',
        userId: 'u1',
        channels: new Set(['project:p2']),
        write,
        close: vi.fn(),
      });

      broadcast({
        type: 'task.updated',
        channel: 'project:p1',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: {},
      });

      expect(write).not.toHaveBeenCalled();
    });
  });

  describe('SSE client management', () => {
    it('should add and remove SSE clients', () => {
      const write = vi.fn();
      addSseClient({
        id: 'sse-1',
        userId: 'u1',
        channels: new Set(['project:p1']),
        write,
        close: vi.fn(),
      });

      broadcast({
        type: 'test',
        channel: 'project:p1',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: {},
      });
      expect(write).toHaveBeenCalledTimes(1);

      removeSseClient('sse-1');

      broadcast({
        type: 'test',
        channel: 'project:p1',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: {},
      });
      expect(write).toHaveBeenCalledTimes(1); // not called again
    });
  });
});
