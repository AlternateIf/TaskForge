import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'upper', label: 'Uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'Lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'Number', test: (pw) => /\d/.test(pw) },
  { id: 'special', label: 'Special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export function getStrengthLevel(password: string): StrengthLevel {
  const met = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
  if (met === 0) return 0;
  if (met === 1) return 1;
  if (met <= 3) return 2;
  if (met === 4) return 3;
  return 4;
}

export function meetsAllRequirements(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(password));
}

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

const SEGMENT_COLORS: Record<StrengthLevel, string> = {
  0: 'bg-surface-container-high',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-warning',
  4: 'bg-success',
};

export function PasswordStrength({ password }: { password: string }) {
  const strength = getStrengthLevel(password);
  const label = STRENGTH_LABELS[strength];
  const segColor = SEGMENT_COLORS[strength];

  return (
    <div className="mt-sm space-y-sm">
      {/* 4-segment bar */}
      <div className="flex items-center gap-xs">
        <div
          className="flex flex-1 gap-xs"
          role="meter"
          aria-label="Password strength"
          aria-valuenow={strength}
          aria-valuemin={0}
          aria-valuemax={4}
        >
          {(['s0', 's1', 's2', 's3'] as const).map((key, i) => (
            <div
              key={key}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-normal',
                i < strength ? segColor : 'bg-surface-container-high',
              )}
            />
          ))}
        </div>
        {label && (
          <span
            className={cn(
              'text-label font-medium',
              strength <= 1 && 'text-danger',
              strength === 2 && 'text-warning',
              strength === 3 && 'text-warning',
              strength === 4 && 'text-success',
            )}
          >
            {label}
          </span>
        )}
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-xs" aria-label="Password requirements">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const met = req.test(password);
          return (
            <li key={req.id} className="flex items-center gap-xs">
              {met ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Circle className="size-3.5 text-muted" aria-hidden="true" />
              )}
              <span className={cn('text-label', met ? 'text-success' : 'text-muted')}>
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
