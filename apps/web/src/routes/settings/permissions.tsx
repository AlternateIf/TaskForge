import { useDeleteOrganization } from '@/api/governance';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from '@tanstack/react-router';
import { ORGANIZATION_DELETE_PERMISSION, hasAnyGovernancePermission } from '@taskforge/shared';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: unknown;
      error?: {
        message?: unknown;
      };
    };

    if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }

    if (
      maybeError.error &&
      typeof maybeError.error.message === 'string' &&
      maybeError.error.message.trim().length > 0
    ) {
      return maybeError.error.message;
    }
  }

  return fallback;
}

export function OrganizationPermissionsPage() {
  const navigate = useNavigate();
  const { user, activeOrganizationId } = useAuthStore();
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canSeeGovernance = hasAnyGovernancePermission(user?.permissions ?? []);
  const canDeleteOrganization = permissionSet.has(ORGANIZATION_DELETE_PERMISSION);

  const deleteOrganization = useDeleteOrganization();
  const [confirmDeleteOrganization, setConfirmDeleteOrganization] = useState(false);

  useEffect(() => {
    if (!canSeeGovernance) {
      toast.error('You do not have organization governance access.');
      void navigate({ to: '/dashboard', replace: true });
    }
  }, [canSeeGovernance, navigate]);

  async function handleDeleteOrganization() {
    if (!activeOrganizationId) {
      toast.error('No active organization selected.');
      return;
    }

    try {
      await deleteOrganization.mutateAsync(activeOrganizationId);
      setConfirmDeleteOrganization(false);
      toast.success('Organization deleted.');
      void navigate({ to: '/settings', replace: true });
    } catch (error) {
      setConfirmDeleteOrganization(false);
      toast.error(getApiErrorMessage(error, 'Could not delete organization. Please try again.'));
    }
  }

  return (
    <div className="space-y-3 p-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/30 bg-surface-container-lowest px-4 py-3">
        <div>
          <h1 className="text-lg font-bold leading-snug text-foreground">
            Organization Permissions
          </h1>
          <p className="text-small text-secondary">
            Review permission-related controls for your organization.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/30 bg-surface-container-lowest p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="size-4 text-blue-500" />
          <p className="text-body font-semibold text-foreground">Permission Actions</p>
        </div>

        {canDeleteOrganization ? (
          <div className="space-y-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
            <div className="space-y-1">
              <p className="text-body font-semibold text-foreground">Delete organization</p>
              <p className="text-small text-muted">
                This permanently removes the organization and cannot be undone.
              </p>
            </div>

            {confirmDeleteOrganization ? (
              <div className="space-y-2">
                <p className="text-small text-danger">
                  Click <strong>Confirm delete</strong> to permanently delete this organization.
                </p>
                <div className="flex flex-wrap gap-sm">
                  <Button
                    type="button"
                    variant="destructive"
                    loading={deleteOrganization.isPending}
                    onClick={() => void handleDeleteOrganization()}
                  >
                    Confirm delete
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={deleteOrganization.isPending}
                    onClick={() => setConfirmDeleteOrganization(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={deleteOrganization.isPending || !activeOrganizationId}
                onClick={() => setConfirmDeleteOrganization(true)}
              >
                Delete Organization
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-border/30 bg-surface-container-low p-3 text-small text-muted">
            You do not have the <span className="font-mono">organization.delete.org</span>{' '}
            permission.
          </div>
        )}
      </div>

      {!canDeleteOrganization ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-warning">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            <p className="text-small">Dangerous actions are hidden without delete permission.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
