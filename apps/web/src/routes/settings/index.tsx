import { useChangePassword } from '@/api/auth';
import {
  type OrganizationSummary,
  useCreateOrganization,
  useOrganizations,
} from '@/api/governance';
import {
  useListSessions,
  useRemoveAvatar,
  useRequestEmailChange,
  useRevokeOtherSessions,
  useRevokeSession,
  useSecurityOverview,
  useUpdateProfile,
  useUploadAvatar,
} from '@/api/users';
import { MfaTwoPanelModal } from '@/components/mfa/mfa-two-panel-modal';
import { Avatar, getAvatarColor, getInitials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordStrength, meetsAllRequirements } from '@/components/ui/password-strength';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  Minus,
  Monitor,
  Plus,
  Settings,
  Smartphone,
  Upload,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function OrgLogo({ org, size = 36 }: { org: { id: string; name: string }; size?: number }) {
  const bg = getAvatarColor(org.id);
  const initials = getInitials(org.name);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-radius-md font-bold text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.3 }}
    >
      {initials}
    </div>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp';

function ProfileTab() {
  const { user, activeOrganizationId } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local blob URL for immediate preview before the server responds
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const isDirty = displayName !== (user?.displayName ?? '');

  // Email change inline form state
  const requestEmailChange = useRequestEmailChange();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailChangeSent, setEmailChangeSent] = useState(false);

  // Revoke blob URL on unmount or when replaced
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));

      uploadAvatar.mutate(file, {
        onSuccess: () => {
          setPreviewUrl(null); // store now has the real URL
          toast.success('Profile photo updated.');
        },
        onError: () => {
          setPreviewUrl(null);
          toast.error(
            "Couldn't upload photo. Make sure it's a JPEG, PNG, GIF, or WebP under 5 MB.",
          );
        },
      });
    },
    [previewUrl, uploadAvatar],
  );

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    // Reset so the same file can be selected again
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    updateProfile.mutate(
      { displayName },
      {
        onSuccess: () => toast.success('Profile updated.'),
        onError: () => toast.error("Couldn't save changes. Please try again."),
      },
    );
  }

  function handleDiscard() {
    setDisplayName(user?.displayName ?? '');
  }

  function handleRemove() {
    removeAvatar.mutate(undefined, {
      onSuccess: () => toast.success('Profile photo removed.'),
      onError: () => toast.error("Couldn't remove photo. Please try again."),
    });
  }

  const avatarSrc = previewUrl ?? user?.avatarUrl ?? undefined;
  const hasPhoto = Boolean(user?.avatarUrl);

  return (
    <div className="grid gap-lg lg:grid-cols-[1fr_320px]">
      {/* Edit form */}
      <div className="rounded-radius-xl border border-border/30 bg-surface-container-lowest">
        <div className="border-b border-border/20 px-lg py-md">
          <span className="text-body font-semibold text-foreground">Profile Information</span>
        </div>
        <div className="p-lg">
          <form onSubmit={handleSave} className="space-y-lg">
            {/* Avatar uploader */}
            <div className="flex items-center gap-lg">
              <div className="relative">
                <Avatar
                  src={avatarSrc}
                  name={user?.displayName}
                  userId={user?.id}
                  size="xl"
                  onClick={openFilePicker}
                  className="cursor-pointer"
                />
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-background bg-surface-container-lowest text-brand-primary shadow-1 hover:bg-surface-container-low"
                >
                  <Camera className="size-3" />
                </button>
              </div>
              <div>
                <p className="text-body font-medium text-foreground">Profile photo</p>
                <p className="text-small text-muted">JPG, PNG, GIF or WebP. Max 5 MB.</p>
                <div className="mt-sm flex items-center gap-sm">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={uploadAvatar.isPending}
                    onClick={openFilePicker}
                  >
                    <Upload className="size-3" />
                    Upload photo
                  </Button>
                  {hasPhoto ? (
                    <button
                      type="button"
                      className="text-small font-medium text-danger hover:underline"
                      onClick={handleRemove}
                      disabled={removeAvatar.isPending}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleInputChange}
            />

            {/* Drop zone */}
            <button
              type="button"
              className="w-full cursor-pointer rounded-radius-md border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 px-lg py-md text-center hover:border-brand-primary/60 hover:bg-brand-primary/10"
              onClick={openFilePicker}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto mb-xs size-5 text-brand-primary/40" />
              <p className="text-small text-secondary">Or drag and drop a photo here</p>
            </button>

            {/* Display name */}
            <div className="space-y-xs">
              <label className="text-label font-semibold text-foreground" htmlFor="displayName">
                Display name
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
                className="border border-border bg-surface-container-lowest"
              />
            </div>

            {/* Email */}
            <div className="space-y-xs">
              <label className="text-label font-semibold text-foreground" htmlFor="email">
                Email address
              </label>
              <div className="flex items-center gap-sm">
                <Input
                  id="email"
                  type="email"
                  value={user?.email ?? ''}
                  readOnly
                  className="flex-1 cursor-pointer border border-border bg-background text-muted"
                  onClick={() => {
                    setShowEmailForm(true);
                    setEmailChangeSent(false);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setShowEmailForm((v) => !v);
                    setEmailChangeSent(false);
                  }}
                >
                  Change email
                </Button>
              </div>

              {showEmailForm &&
                (emailChangeSent ? (
                  <div className="flex items-start gap-sm rounded-radius-md border border-border/20 bg-surface-container-low p-md">
                    <CheckCircle className="mt-0.5 size-4 shrink-0 text-success" />
                    <div>
                      <p className="text-body font-medium text-foreground">Check your new inbox</p>
                      <p className="text-label text-secondary">
                        We sent a confirmation link to <strong>{newEmail}</strong>. Click it to
                        apply the change.
                      </p>
                      <button
                        type="button"
                        className="mt-xs text-small font-medium text-brand-primary hover:underline"
                        onClick={() => {
                          setEmailChangeSent(false);
                          setNewEmail('');
                          setEmailPassword('');
                        }}
                      >
                        Send again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-sm rounded-radius-md border border-border/30 bg-surface-container-low p-md">
                    <div className="space-y-xs">
                      <label
                        className="text-label font-semibold text-foreground"
                        htmlFor="newEmail"
                      >
                        New email address
                      </label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="border border-border bg-surface-container-lowest"
                        placeholder="new@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-xs">
                      <label
                        className="text-label font-semibold text-foreground"
                        htmlFor="emailPassword"
                      >
                        Current password
                      </label>
                      <Input
                        id="emailPassword"
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        className="border border-border bg-surface-container-lowest"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <div className="flex gap-sm">
                      <Button
                        type="button"
                        size="sm"
                        loading={requestEmailChange.isPending}
                        disabled={!newEmail || !emailPassword}
                        onClick={() => {
                          requestEmailChange.mutate(
                            { newEmail, currentPassword: emailPassword },
                            {
                              onSuccess: () => setEmailChangeSent(true),
                              onError: (err) =>
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : 'Could not send confirmation.',
                                ),
                            },
                          );
                        }}
                      >
                        Send confirmation
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowEmailForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-sm border-t border-border/20 pt-md">
              <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
                Save changes
              </Button>
              {isDirty ? (
                <Button type="button" variant="secondary" onClick={handleDiscard}>
                  Discard
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      {/* Right column: org cards */}
      <div className="rounded-radius-xl border border-border/30 bg-surface-container-lowest">
        <div className="border-b border-border/20 px-lg py-md">
          <span className="text-body font-semibold text-foreground">Your Organizations</span>
        </div>
        <div className="p-lg">
          {(user?.organizations ?? []).length > 0 ? (
            <div className="space-y-sm">
              {(user?.organizations ?? []).map((org) => {
                const isCurrent = org.id === activeOrganizationId;
                return (
                  <div
                    key={org.id}
                    className="flex items-center gap-sm rounded-radius-md px-sm py-sm"
                  >
                    <OrgLogo org={org} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium text-foreground">{org.name}</p>
                      {isCurrent ? (
                        <Badge variant="default" className="mt-xs">
                          Current
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-body text-secondary">No organization memberships.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Security tab ─────────────────────────────────────────────────────────────

function formatLastLogin(iso: string | null | undefined): { short: string; long: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  let short: string;
  if (diffMins < 1) short = 'Just now';
  else if (diffMins < 60) short = `${diffMins}m ago`;
  else if (diffHours < 24) short = `${diffHours}h ago`;
  else if (diffDays < 30) short = `${diffDays}d ago`;
  else short = date.toLocaleDateString();

  const long = date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return { short, long };
}

function getMfaGracePeriodStatus(gracePeriodEndsAt?: string | null): {
  remainingDays: number | null;
  graceExpired: boolean;
} {
  if (!gracePeriodEndsAt) {
    return {
      remainingDays: null,
      graceExpired: true,
    };
  }

  const endsAt = new Date(gracePeriodEndsAt).getTime();
  if (Number.isNaN(endsAt)) {
    return {
      remainingDays: null,
      graceExpired: true,
    };
  }

  const diffMs = endsAt - Date.now();
  if (diffMs <= 0) {
    return {
      remainingDays: 0,
      graceExpired: true,
    };
  }

  return {
    remainingDays: Math.ceil(diffMs / 86_400_000),
    graceExpired: false,
  };
}

function SecurityTab() {
  const changePassword = useChangePassword();
  const security = useSecurityOverview();
  const revokeOthers = useRevokeOtherSessions();
  const sessionList = useListSessions();
  const revokeSession = useRevokeSession();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);

  function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!meetsAllRequirements(newPassword)) {
      toast.error('New password does not meet all requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordChanged(true);
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Could not change password. Please try again.';
          toast.error(message);
        },
      },
    );
  }

  const mfaEnabled = security.data?.mfaEnabled ?? false;
  const mfaEnforcedByOrg = security.data?.mfaEnforcedByOrg ?? false;
  const mfaGracePeriodEndsAt = security.data?.mfaGracePeriodEndsAt ?? null;
  const graceStatus = getMfaGracePeriodStatus(mfaGracePeriodEndsAt);
  const graceExpired = mfaEnforcedByOrg ? graceStatus.graceExpired : false;
  const lastLogin = formatLastLogin(security.data?.lastLoginAt);
  const activeSessions = security.data?.activeSessions ?? 0;
  // activeSessions tile kept from security overview; session list used for the card below

  return (
    <div className="space-y-lg">
      {/* Overview tiles */}
      <div className="grid grid-cols-3 gap-md">
        {/* MFA Status */}
        <div className="rounded-radius-xl border border-border/30 bg-surface-container-lowest px-lg py-md">
          <p className="text-small font-semibold uppercase tracking-wider text-muted">MFA Status</p>
          <div className="mt-sm flex items-center gap-xs">
            {security.isLoading ? (
              <span className="text-body text-muted">Loading…</span>
            ) : mfaEnabled ? (
              <span className="text-body font-semibold text-success">Enabled</span>
            ) : (
              <span className="text-body font-semibold text-danger">Disabled</span>
            )}
          </div>
          <button
            type="button"
            className="mt-sm text-small font-medium text-brand-primary hover:underline"
            onClick={() => setMfaModalOpen(true)}
          >
            Manage →
          </button>
        </div>

        {/* Last Login */}
        <div className="rounded-radius-xl border border-border/30 bg-surface-container-lowest px-lg py-md">
          <p className="text-small font-semibold uppercase tracking-wider text-muted">Last Login</p>
          {security.isLoading ? (
            <p className="mt-sm text-body text-muted">Loading…</p>
          ) : lastLogin ? (
            <>
              <p className="mt-sm text-heading-2 font-semibold text-foreground">
                {lastLogin.short}
              </p>
              <p className="text-small text-muted">{lastLogin.long}</p>
            </>
          ) : (
            <p className="mt-sm text-body text-muted">Never</p>
          )}
        </div>

        {/* Active Sessions */}
        <div className="rounded-radius-xl border-b border-border bg-surface-container-lowest px-lg py-md">
          <p className="text-small font-semibold uppercase tracking-wider text-muted">
            Active Sessions
          </p>
          {security.isLoading ? (
            <p className="mt-sm text-body text-muted">Loading…</p>
          ) : (
            <p className="mt-sm text-heading-2 font-semibold text-foreground">{activeSessions}</p>
          )}
        </div>
      </div>

      {/* Two-column: password | sessions */}
      <div className="grid gap-lg lg:grid-cols-2">
        {/* Change password */}
        <div className="rounded-radius-xl border border-border/30 bg-surface-container-lowest">
          <div className="border-b border-border/20 px-lg py-md">
            <span className="text-body font-semibold text-foreground">Change Password</span>
          </div>
          <div className="p-lg">
            {passwordChanged ? (
              <div className="flex items-start gap-sm rounded-radius-md border border-border/20 bg-surface-container-low p-md">
                <CheckCircle className="mt-0.5 size-5 shrink-0 text-success" />
                <div>
                  <p className="text-body font-medium text-foreground">Password changed</p>
                  <p className="text-label text-secondary">
                    A security notification has been sent to your email. All other sessions have
                    been signed out.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-sm"
                    onClick={() => setPasswordChanged(false)}
                  >
                    Change again
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-md">
                <div className="space-y-xs">
                  <label
                    className="text-label font-semibold text-foreground"
                    htmlFor="currentPassword"
                  >
                    Current password
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="border border-border bg-surface-container-lowest"
                  />
                </div>

                <div className="space-y-xs">
                  <label className="text-label font-semibold text-foreground" htmlFor="newPassword">
                    New password
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="border border-border bg-surface-container-lowest pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-sm top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {newPassword && <PasswordStrength password={newPassword} />}
                </div>

                <div className="space-y-xs">
                  <label
                    className="text-label font-semibold text-foreground"
                    htmlFor="confirmPassword"
                  >
                    Confirm new password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="border border-border bg-surface-container-lowest"
                  />
                </div>

                <div className="flex items-start gap-xs rounded-radius-md border border-brand-primary/20 bg-brand-primary/5 p-sm">
                  <Info className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                  <p className="text-small text-brand-primary">
                    You'll receive a confirmation email. Your password changes only after you click
                    the link.
                  </p>
                </div>

                <Button type="submit" loading={changePassword.isPending}>
                  Send confirmation email
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Active sessions */}
        <div className="rounded-radius-xl border border-border/30 bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-border px-lg py-md">
            <span className="text-body font-semibold text-foreground">Active Sessions</span>
            <button
              type="button"
              disabled={(sessionList.data?.length ?? 0) <= 1}
              className="text-small font-medium text-danger hover:underline disabled:pointer-events-none disabled:opacity-40"
              onClick={() =>
                revokeOthers.mutate(undefined, {
                  onSuccess: (res) => {
                    const n = res.data.revoked;
                    toast.success(
                      n > 0
                        ? `${n} other session${n === 1 ? '' : 's'} revoked.`
                        : 'No other active sessions.',
                    );
                    void security.refetch();
                    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
                  },
                  onError: () => toast.error("Couldn't revoke sessions. Please try again."),
                })
              }
            >
              Revoke all others
            </button>
          </div>
          <div>
            {sessionList.isLoading ? (
              <p className="px-lg py-md text-body text-muted">Loading…</p>
            ) : (
              (sessionList.data ?? []).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-sm border-b border-border px-lg py-sm"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-radius-md bg-brand-primary/10">
                    {session.deviceType === 'mobile' ? (
                      <Smartphone className="size-4 text-brand-primary" />
                    ) : (
                      <Monitor className="size-4 text-brand-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-foreground">
                      {session.browser} on {session.os}
                    </p>
                    <p className="text-small text-muted">
                      {session.ipAddress ?? 'Unknown IP'} · Signed in{' '}
                      {formatLastLogin(session.createdAt)?.short ?? '—'}
                    </p>
                  </div>
                  {session.isCurrent ? (
                    <Badge variant="default">Current</Badge>
                  ) : (
                    <button
                      type="button"
                      className="text-small font-medium text-danger hover:underline"
                      onClick={() =>
                        revokeSession.mutate(session.id, {
                          onSuccess: () => {
                            toast.success('Session revoked.');
                            void security.refetch();
                            void queryClient.invalidateQueries({ queryKey: ['sessions'] });
                          },
                          onError: () => toast.error("Couldn't revoke session."),
                        })
                      }
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <MfaTwoPanelModal
        open={mfaModalOpen}
        onOpenChange={setMfaModalOpen}
        mfaEnabled={mfaEnabled}
        orgEnforced={mfaEnforcedByOrg}
        mfaGracePeriodEndsAt={mfaGracePeriodEndsAt}
        gracePeriodRemainingDays={graceStatus.remainingDays}
        graceExpired={graceExpired}
      />
    </div>
  );
}

// ─── Organizations tab ─────────────────────────────────────────────────────────

function OrgCard({
  org,
  isActive,
  onSwitch,
}: {
  org: OrganizationSummary;
  isActive: boolean;
  onSwitch: () => void;
}) {
  return (
    <div className="flex flex-col gap-md rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg">
      {/* Info row */}
      <div className="flex items-center gap-md">
        <OrgLogo org={org} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-foreground">{org.name}</p>
          <div className="mt-xs flex items-center gap-xs text-small text-muted">
            {org.userRole ? (
              <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-sm py-0.5 text-label font-semibold text-brand-primary">
                {org.userRole}
              </span>
            ) : null}
            {org.userRole ? <span>·</span> : null}
            <Users className="size-3 shrink-0" />
            <span>
              {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
        {isActive ? <Badge variant="default">Current</Badge> : null}
      </div>

      {/* Actions */}
      <div className="flex gap-sm border-t border-border/20 pt-sm">
        {isActive ? (
          <span className="inline-flex h-8 items-center rounded-radius-md border border-border/30 px-md text-small font-medium text-muted">
            Active workspace
          </span>
        ) : (
          <Button type="button" variant="primary" size="sm" onClick={onSwitch}>
            Switch to
          </Button>
        )}
      </div>
    </div>
  );
}

function OrganizationsTab() {
  const { activeOrganizationId, setActiveOrganizationId } = useAuthStore();
  const permissionSet = new Set(useAuthStore.getState().user?.permissions ?? []);
  const canCreate = permissionSet.has('organization.create.org');

  const orgs = useOrganizations();
  const createOrg = useCreateOrganization();
  const [newOrgName, setNewOrgName] = useState('');
  const [showForm, setShowForm] = useState(false);

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    createOrg.mutate(
      { name: newOrgName },
      {
        onSuccess: () => {
          setNewOrgName('');
          setShowForm(false);
          toast.success('Organization created.');
        },
        onError: () => toast.error("Couldn't create organization. Please try again."),
      },
    );
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-2 font-semibold text-foreground">Your Organizations</h2>
          <p className="text-body text-secondary">Workspaces you belong to</p>
        </div>
        {canCreate ? (
          <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
            Create organization
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="flex gap-sm rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg"
        >
          <Input
            placeholder="Organization name"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            required
            className="flex-1 border border-border bg-surface-container-lowest"
          />
          <Button type="submit" loading={createOrg.isPending}>
            Create
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </form>
      ) : null}

      {orgs.data && orgs.data.length > 0 ? (
        <div className="grid gap-md sm:grid-cols-2">
          {orgs.data.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              isActive={org.id === activeOrganizationId}
              onSwitch={() => setActiveOrganizationId(org.id)}
            />
          ))}
        </div>
      ) : orgs.isLoading ? (
        <p className="text-body text-secondary">Loading…</p>
      ) : (
        <p className="text-body text-secondary">You're not part of any organizations yet.</p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type SettingsTab = 'profile' | 'security' | 'organizations';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'organizations', label: 'Organizations' },
];

export function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <div className="p-lg">
      {/* Page header */}
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <div className="flex size-10 items-center justify-center rounded-radius-lg bg-brand-primary/10">
            <Settings className="size-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-[1.375rem] font-bold leading-snug text-foreground">Settings</h1>
            <p className="text-small text-secondary">Manage your profile, security, and access</p>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <Avatar name={user?.displayName} userId={user?.id} size="md" />
          <div>
            <p className="text-body font-medium text-foreground">{user?.displayName}</p>
            <p className="text-small text-muted">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Underline tab bar — same as project settings */}
      <div
        className="mb-lg flex gap-xs border-b border-border"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`settings-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'border-b-2 px-md pb-sm text-body font-medium transition-colors',
              activeTab === tab.id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div id={`settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={activeTab}>
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'organizations' && <OrganizationsTab />}
      </div>
    </div>
  );
}
