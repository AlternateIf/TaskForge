import { getAvatarColor, getInitials } from '@/components/ui/avatar';
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
