import { describe, expect, it, vi } from 'vitest';
import type { MentionUser } from './mention-suggestion';
import { createMentionSuggestion } from './mention-suggestion';

const mockUsers: MentionUser[] = [
  { id: '1', displayName: 'Alice Johnson', email: 'alice@example.com', avatarUrl: null },
  { id: '2', displayName: 'Bob Smith', email: 'bob@example.com', avatarUrl: null },
  { id: '3', displayName: 'Charlie Brown', email: 'charlie@example.com', avatarUrl: null },
  { id: '4', displayName: 'Diana Prince', email: 'diana@example.com', avatarUrl: null },
  { id: '5', displayName: 'Eve Adams', email: 'eve@example.com', avatarUrl: null },
  { id: '6', displayName: 'Frank Castle', email: 'frank@example.com', avatarUrl: null },
  { id: '7', displayName: 'Grace Lee', email: 'grace@example.com', avatarUrl: null },
  { id: '8', displayName: 'Hank Pym', email: 'hank@example.com', avatarUrl: null },
  { id: '9', displayName: 'Iris West', email: 'iris@example.com', avatarUrl: null },
  { id: '10', displayName: 'Jack Ryan', email: 'jack@example.com', avatarUrl: null },
];

describe('createMentionSuggestion', () => {
  it('calls fetchUsers with query and returns max 8 results', async () => {
    const fetchUsers = vi.fn().mockResolvedValue(mockUsers);
    const suggestion = createMentionSuggestion(fetchUsers);

    const result = await suggestion.items({ query: 'test' });

    expect(fetchUsers).toHaveBeenCalledWith('test');
    expect(result).toHaveLength(8);
  });

  it('returns fewer results when less than 8 available', async () => {
    const fetchUsers = vi.fn().mockResolvedValue(mockUsers.slice(0, 3));
    const suggestion = createMentionSuggestion(fetchUsers);

    const result = await suggestion.items({ query: 'a' });

    expect(result).toHaveLength(3);
  });

  it('returns empty array when no users match', async () => {
    const fetchUsers = vi.fn().mockResolvedValue([]);
    const suggestion = createMentionSuggestion(fetchUsers);

    const result = await suggestion.items({ query: 'zzz' });

    expect(result).toHaveLength(0);
  });

  it('supports sync fetchUsers function', async () => {
    const fetchUsers = vi.fn().mockReturnValue(mockUsers.slice(0, 2));
    const suggestion = createMentionSuggestion(fetchUsers);

    const result = await suggestion.items({ query: '' });

    expect(result).toHaveLength(2);
  });
});
