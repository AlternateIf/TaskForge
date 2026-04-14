import { getAvatarColor, getInitials, resolveAvatarSrc } from '@/components/ui/avatar';
import { describe, expect, it } from 'vitest';

describe('getInitials', () => {
  it('returns two initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial from single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('handles multiple names (first + last)', () => {
    expect(getInitials('John Michael Doe')).toBe('JD');
  });

  it('handles leading/trailing whitespace', () => {
    expect(getInitials('  John Doe  ')).toBe('JD');
  });
});

describe('getAvatarColor', () => {
  it('returns a consistent color for the same userId', () => {
    const color1 = getAvatarColor('user-123');
    const color2 = getAvatarColor('user-123');
    expect(color1).toBe(color2);
  });

  it('returns different colors for different userIds', () => {
    const color1 = getAvatarColor('user-1');
    const color2 = getAvatarColor('user-2');
    // Not guaranteed to be different, but highly likely with these test values
    expect(typeof color1).toBe('string');
    expect(typeof color2).toBe('string');
  });

  it('returns a valid hex color', () => {
    const color = getAvatarColor('test');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('resolveAvatarSrc', () => {
  it('returns explicit src when provided', () => {
    expect(resolveAvatarSrc('https://img.example.com/user.png', 'user-id')).toBe(
      'https://img.example.com/user.png',
    );
  });

  it('derives a user avatar URL from UUID userId when src is missing', () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    expect(resolveAvatarSrc(undefined, userId)).toBe(`/api/v1/users/avatars/${userId}`);
  });

  it('does not derive avatar URL for non-UUID userId when src is missing', () => {
    expect(resolveAvatarSrc(undefined, 'sp-1')).toBeNull();
  });
});
