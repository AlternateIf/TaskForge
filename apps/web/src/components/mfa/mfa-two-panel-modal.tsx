import { useMfaDisable, useMfaReset, useMfaSetup, useMfaVerifySetup } from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { QRCode } from 'react-qr-code';
import { toast } from 'sonner';

interface MfaTwoPanelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mfaEnabled: boolean;
  orgEnforced?: boolean;
  mfaGracePeriodEndsAt?: string | null;
  gracePeriodRemainingDays?: number | null;
  graceExpired?: boolean;
}

function normalizeOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

function getRateLimitSeconds(message: string): number {
  const match = message.match(/(\d+)/);
  if (!match) return 30;
  const seconds = Number.parseInt(match[1], 10);
  if (Number.isNaN(seconds) || seconds <= 0) return 30;
  return seconds;
}

function isPendingSetupError(err: unknown): boolean {
  const apiError = err as ApiError;
  return apiError.status === 400 && (apiError.message ?? '').toLowerCase().includes('pending');
}

export function MfaTwoPanelModal({
  open,
  onOpenChange,
  mfaEnabled,
  orgEnforced = false,
  mfaGracePeriodEndsAt,
  gracePeriodRemainingDays,
  graceExpired = false,
}: MfaTwoPanelModalProps) {
  const setup = useMfaSetup();
  const verifySetup = useMfaVerifySetup();
  const disableMfa = useMfaDisable();
  const resetMfa = useMfaReset();

  const [code, setCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const rateLimitSecondsLeft =
    rateLimitUntil && rateLimitUntil > nowTs ? Math.ceil((rateLimitUntil - nowTs) / 1000) : 0;
  const isRateLimited = rateLimitSecondsLeft > 0;

  useEffect(() => {
    if (!open) {
      setCode('');
      setRecoveryPassword('');
      setShowRecovery(false);
      setRecoveryError(null);
      setErrorMessage(null);
      setRateLimitUntil(null);
      setNowTs(Date.now());
      setup.reset();
      verifySetup.reset();
      disableMfa.reset();
      resetMfa.reset();
      return;
    }

    if (!mfaEnabled && !setup.data && !setup.isPending && !setup.isError) {
      setup.mutate(undefined, {
        onSuccess: () => {
          setShowRecovery(false);
          setRecoveryError(null);
        },
        onError: (err) => {
          if (isPendingSetupError(err)) {
            setShowRecovery(true);
            setRecoveryError(null);
            setErrorMessage(null);
            return;
          }

          setErrorMessage((err as ApiError).message ?? 'Unable to start MFA setup.');
        },
      });
    }
  }, [open, mfaEnabled, setup, verifySetup, disableMfa, resetMfa]);

  useEffect(() => {
    if (!isRateLimited) return;

    const timer = window.setInterval(() => {
      setNowTs(Date.now());
      if (rateLimitUntil && Date.now() >= rateLimitUntil) {
        setRateLimitUntil(null);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRateLimited, rateLimitUntil]);

  const isSetupFlow = !mfaEnabled;
  const disableBlockedByOrgPolicy = orgEnforced && graceExpired;

  function setApiError(err: unknown) {
    const apiError = err as ApiError;

    if (apiError.status === 403 && apiError.code === 'MFA_ENFORCED_BY_ORG') {
      setErrorMessage('Your organization policy currently blocks disabling MFA.');
      return;
    }

    if (apiError.status === 429) {
      const seconds = getRateLimitSeconds(apiError.message ?? '30');
      setRateLimitUntil(Date.now() + seconds * 1000);
      setErrorMessage(`Too many attempts. Try again in ${seconds}s.`);
      return;
    }

    if (apiError.status === 400) {
      setErrorMessage(
        apiError.message ??
          (isSetupFlow
            ? 'Setup is incomplete. Restart setup and try again.'
            : 'MFA disable request is invalid.'),
      );
      return;
    }

    if (apiError.status === 401) {
      setErrorMessage('Invalid authenticator code. Please check and try again.');
      return;
    }

    if (apiError.status === 500) {
      setErrorMessage('Something went wrong on our side. Please try again in a moment.');
      return;
    }

    setErrorMessage(apiError.message ?? 'Request failed. Please try again.');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    const normalized = normalizeOtp(code);
    if (normalized.length !== 6) {
      setErrorMessage('A 6-digit authenticator code is required.');
      return;
    }

    try {
      if (isSetupFlow) {
        await verifySetup.mutateAsync({ code: normalized });
        toast.success('MFA has been enabled.');
      } else {
        await disableMfa.mutateAsync({ code: normalized });
        toast.success('MFA has been disabled.');
      }
      onOpenChange(false);
    } catch (err) {
      setApiError(err);
    }
  }

  async function handleRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    setRecoveryError(null);
    setErrorMessage(null);

    if (!recoveryPassword.trim()) {
      setRecoveryError('Current password is required to reset pending MFA setup.');
      return;
    }

    try {
      await resetMfa.mutateAsync({ password: recoveryPassword });
    } catch (err) {
      const apiError = err as ApiError;

      if (apiError.status === 400 && apiError.message === 'Invalid password') {
        setRecoveryError('Incorrect password');
        return;
      }

      if (isPendingSetupError(err)) {
        setShowRecovery(true);
      }

      setRecoveryError(apiError.message ?? 'Unable to reset pending MFA setup.');
      return;
    }

    setRecoveryPassword('');

    try {
      await setup.mutateAsync();
      setShowRecovery(false);
      setRecoveryError(null);
      toast.success('Pending MFA setup reset. Scan your fresh QR code to continue.');
    } catch (err) {
      const apiError = err as ApiError;

      setShowRecovery(false);
      setErrorMessage(
        apiError.message ??
          'Pending MFA setup was reset, but we could not load a fresh setup. Close and reopen this modal to try again.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[920px] overflow-auto p-0">
        <DialogHeader className="border-b border-border/20 px-lg py-md">
          <DialogTitle>
            {isSetupFlow ? 'Set up Multi-Factor Authentication' : 'Manage MFA'}
          </DialogTitle>
          <DialogDescription>
            {isSetupFlow
              ? 'Configure your authenticator app, then verify with one code.'
              : 'Confirm your identity before disabling MFA on this account.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md p-lg">
          {orgEnforced ? (
            <Alert variant="warning" className="rounded-radius-md p-md">
              <AlertTriangle className="mt-0.5" />
              <div>
                <AlertTitle>MFA is enforced by your organization</AlertTitle>
                <AlertDescription>
                  {gracePeriodRemainingDays && gracePeriodRemainingDays > 0
                    ? `Grace period: ${gracePeriodRemainingDays} day${gracePeriodRemainingDays === 1 ? '' : 's'} remaining.`
                    : disableBlockedByOrgPolicy
                      ? 'Disabling MFA is blocked by organization security policy.'
                      : mfaGracePeriodEndsAt
                        ? `Grace period ends at ${new Date(mfaGracePeriodEndsAt).toLocaleString()}.`
                        : 'Organization policy requires MFA.'}
                </AlertDescription>
              </div>
            </Alert>
          ) : null}

          <div className="grid gap-md md:grid-cols-[1fr_1fr]">
            <section className="rounded-radius-lg border border-border/30 bg-surface-container-lowest p-md">
              {isSetupFlow ? (
                <>
                  <h3 className="text-body font-semibold text-foreground">
                    Set up Authenticator App
                  </h3>
                  <p className="mt-xs text-small text-secondary">
                    Scan this QR code using Google Authenticator, 1Password, or another compatible
                    app.
                  </p>

                  {showRecovery ? (
                    <Alert variant="warning" className="mt-md rounded-radius-md p-sm">
                      <AlertTriangle className="mt-0.5" />
                      <div>
                        <AlertDescription>
                          You have a pending MFA setup that was never completed.
                        </AlertDescription>
                      </div>
                    </Alert>
                  ) : null}

                  <div className="mt-md flex justify-center rounded-radius-md border border-border/30 bg-white p-md">
                    {setup.data?.uri ? (
                      <QRCode
                        value={setup.data.uri}
                        size={172}
                        bgColor="#ffffff"
                        fgColor="#111827"
                      />
                    ) : (
                      <span className="text-small text-muted">
                        {setup.isPending ? 'Generating QR code…' : 'QR code unavailable'}
                      </span>
                    )}
                  </div>

                  <div className="mt-md rounded-radius-md border border-border/20 bg-surface-container-low p-sm">
                    <p className="text-small font-semibold text-foreground">
                      Can’t scan the QR code?
                    </p>
                    <p className="mt-xs text-small text-secondary">Use this manual key:</p>
                    <p className="mt-xs break-all font-mono text-small tracking-[0.16em] text-foreground">
                      {setup.data?.secret ?? '—'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-body font-semibold text-foreground">MFA is enabled</h3>
                  <p className="mt-xs text-small text-secondary">
                    Your account currently requires an authenticator code for sign in.
                  </p>
                  <Alert variant="destructive" className="mt-md rounded-radius-md p-md">
                    <AlertTriangle className="mt-0.5" />
                    <div>
                      <AlertTitle>Security warning</AlertTitle>
                      <AlertDescription>
                        Disabling MFA reduces account protection and increases takeover risk.
                      </AlertDescription>
                    </div>
                  </Alert>
                </>
              )}
            </section>

            <section className="rounded-radius-lg border border-border/30 bg-surface-container-lowest p-md">
              {isSetupFlow && showRecovery ? (
                <form
                  onSubmit={(event) => void handleRecoverySubmit(event)}
                  className="space-y-md"
                  noValidate
                >
                  <div className="space-y-xs">
                    <label
                      htmlFor="mfa-recovery-password"
                      className="text-label font-semibold text-foreground"
                    >
                      Account password
                    </label>
                    <Input
                      id="mfa-recovery-password"
                      type="password"
                      required
                      aria-required="true"
                      autoComplete="current-password"
                      value={recoveryPassword}
                      onChange={(event) => {
                        setRecoveryPassword(event.target.value);
                        if (recoveryError) setRecoveryError(null);
                      }}
                      placeholder="Enter your current password"
                      className="border border-border bg-surface-container-lowest"
                      aria-invalid={Boolean(recoveryError)}
                      aria-describedby={recoveryError ? 'mfa-recovery-password-error' : undefined}
                    />
                  </div>

                  {recoveryError ? (
                    <Alert variant="destructive" className="rounded-radius-md p-sm">
                      <AlertTriangle className="mt-0.5" />
                      <div>
                        <AlertDescription id="mfa-recovery-password-error">
                          {recoveryError}
                        </AlertDescription>
                      </div>
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-sm">
                    <Button
                      type="submit"
                      loading={resetMfa.isPending || setup.isPending}
                      disabled={resetMfa.isPending || setup.isPending}
                    >
                      Reset and start over
                    </Button>

                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={(event) => void handleSubmit(event)}
                  className="space-y-md"
                  noValidate
                >
                  <div className="space-y-xs">
                    <label
                      htmlFor="mfa-action-code"
                      className="text-label font-semibold text-foreground"
                    >
                      Authenticator code
                    </label>
                    <Input
                      id="mfa-action-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(normalizeOtp(event.target.value))}
                      placeholder="Enter 6-digit code"
                      className="border border-border bg-surface-container-lowest"
                      aria-invalid={Boolean(errorMessage)}
                    />
                  </div>

                  {errorMessage ? (
                    <Alert variant="destructive" className="rounded-radius-md p-sm">
                      <AlertTriangle className="mt-0.5" />
                      <div>
                        <AlertDescription>
                          {errorMessage}
                          {isRateLimited ? ` (${rateLimitSecondsLeft}s remaining)` : ''}
                        </AlertDescription>
                      </div>
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-sm">
                    {isSetupFlow ? (
                      <Button
                        type="submit"
                        loading={verifySetup.isPending}
                        disabled={setup.isPending || isRateLimited}
                      >
                        <CheckCircle2 className="size-4" />
                        Verify & Enable
                      </Button>
                    ) : disableBlockedByOrgPolicy ? (
                      <span className="inline-flex items-center gap-xs rounded-radius-md border border-warning/30 bg-warning/10 px-sm py-xs text-small text-warning">
                        <ShieldCheck className="size-4" />
                        Disabled by organization policy
                      </span>
                    ) : (
                      <Button
                        type="submit"
                        variant="destructive"
                        loading={disableMfa.isPending}
                        disabled={isRateLimited}
                      >
                        Disable MFA
                      </Button>
                    )}

                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
