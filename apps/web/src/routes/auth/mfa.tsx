import { useVerifyMfa } from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AuthMobileHeader } from './auth-mobile-header';
import { AuthBrandPanel } from './brand-panel';

// ─── 6-digit OTP input ────────────────────────────────────────────────────────

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
}

function OtpInput({ value, onChange }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, char: string) {
    const digit = char.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = digit;
    const newVal = arr.join('').replace(/[^\d]/g, '');
    onChange(newVal.slice(0, 6));
    if (digit && i < 5) {
      inputsRef.current[i + 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) {
        const arr = value.split('');
        arr[i - 1] = '';
        onChange(arr.join('').slice(0, 6));
        inputsRef.current[i - 1]?.focus();
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      e.preventDefault();
      onChange(pasted.padEnd(6, '').slice(0, 6));
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  return (
    <fieldset className="flex gap-sm border-0 p-0 m-0" onPaste={handlePaste}>
      <legend className="sr-only">One-time password</legend>
      {(['d0', 'd1', 'd2', 'd3', 'd4', 'd5'] as const).map((key, i) => (
        <input
          key={key}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
          className="h-12 w-10 rounded-radius-md border border-border bg-surface-container-lowest text-center text-heading-2 font-bold text-foreground caret-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      ))}
    </fieldset>
  );
}

// ─── MfaPage ──────────────────────────────────────────────────────────────────

export function MfaPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/mfa' });
  const verifyMfa = useVerifyMfa();

  const mfaToken = (search as { token: string }).token;
  const [code, setCode] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      toast.error('Please enter all 6 digits');
      return;
    }
    try {
      await verifyMfa.mutateAsync({ mfaToken, code });
      void navigate({ to: '/dashboard' });
    } catch (err) {
      const msg = (err as ApiError).message ?? 'Invalid code';
      toast.error(msg);
      setCode('');
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <AuthBrandPanel />

      <main className="flex flex-1 flex-col" id="main-content">
        <AuthMobileHeader />
        <div className="flex flex-1 items-center justify-center px-xl py-xl sm:px-2xl lg:px-3xl">
          <div className="w-full max-w-112 space-y-xl text-center">
            <div className="flex flex-col items-center gap-md">
              <div className="flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                <ShieldCheck className="size-7" />
              </div>
              <div>
                <h2 className="text-heading-1 font-bold text-foreground">
                  Two-factor verification
                </h2>
                <p className="mt-xs text-body text-muted">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-lg" noValidate>
              <div className="flex justify-center">
                <OtpInput value={code} onChange={setCode} />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={verifyMfa.isPending}
              >
                Verify
              </Button>
            </form>

            <button
              type="button"
              onClick={() => void navigate({ to: '/auth/login', search: { redirect: undefined } })}
              className="text-small text-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
