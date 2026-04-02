import { useDocumentTitle } from '@/hooks/use-document-title';
import { SearchX } from 'lucide-react';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-2xl rounded-radius-xl border border-border/30 bg-surface-container-low p-xl text-center shadow-1">
        <div className="mx-auto mb-md flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <SearchX className="size-7" />
        </div>

        <h1 className="text-heading-2 font-semibold text-foreground">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-sm text-body text-muted">
          The link may be outdated, or the page may have been moved.
        </p>

        <div className="mt-md">
          <a
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-radius-md bg-brand-primary px-md text-small font-semibold text-white transition-colors hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </section>
  );
}
