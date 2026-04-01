import { z } from 'zod';

// Lenient UUID validator: accepts any 8-4-4-4-12 hex string.
// Zod v4 tightened z.string().uuid() to require RFC 4122 version/variant bits,
// which rejects seeded / hand-crafted IDs like 00000000-0000-0000-0000-000000000051.
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uid = (msg = 'Invalid ID') => z.string().regex(UUID_PATTERN, msg);
