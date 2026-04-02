import { initiateOAuth, useOAuthProviders } from '@/api/auth';
import type { OAuthProviderInfo } from '@/api/auth';
import { KeyRound } from 'lucide-react';

// ─── Built-in provider icons ──────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z" />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: OAuthProviderInfo }) {
  if (provider.id === 'google') return <GoogleIcon />;
  if (provider.id === 'github') return <GitHubIcon />;
  if (provider.logoUrl) {
    return (
      <img
        src={provider.logoUrl}
        alt=""
        aria-hidden="true"
        className="size-[18px] object-contain"
      />
    );
  }
  return <KeyRound className="size-[18px]" aria-hidden="true" />;
}

// ─── OAuthButtons ─────────────────────────────────────────────────────────────

interface OAuthButtonsProps {
  /** Text shown in the divider below the buttons, e.g. "or continue with email" */
  dividerLabel: string;
  allowedProviderIds?: string[];
  onProviderClick?: (providerId: string) => void;
}

/**
 * Fetches the list of configured OAuth providers from the API and renders a
 * button for each one. Renders nothing (including the divider) when no
 * providers are configured or while the request is in-flight.
 */
export function OAuthButtons({
  dividerLabel,
  allowedProviderIds,
  onProviderClick,
}: OAuthButtonsProps) {
  const { data: providers } = useOAuthProviders();

  if (!providers || providers.length === 0) return null;
  const filteredProviders = allowedProviderIds
    ? providers.filter((provider) => allowedProviderIds.includes(provider.id))
    : providers;
  if (filteredProviders.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-sm">
        {filteredProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() =>
              onProviderClick ? onProviderClick(provider.id) : initiateOAuth(provider.id)
            }
            className="flex h-11 w-full items-center justify-center gap-sm rounded-radius-md border border-border bg-surface-container-lowest px-lg py-xs text-sm font-medium text-foreground transition-colors hover:bg-surface-container-low"
          >
            <ProviderIcon provider={provider} />
            Continue with {provider.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-sm">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-xs text-muted">{dividerLabel}</span>
        <div className="h-px flex-1 bg-border/50" />
      </div>
    </>
  );
}
