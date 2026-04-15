import type { DashboardProjectProgressItem } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

const PROJECTS_PER_PAGE = 10;

interface DashboardProjectProgressProps {
  projects: DashboardProjectProgressItem[];
  isLoading?: boolean;
  isError?: boolean;
}

export function DashboardProjectProgress({
  projects,
  isLoading,
  isError,
}: DashboardProjectProgressProps) {
  const [startIndex, setStartIndex] = useState(0);

  const pageItems = useMemo(
    () => projects.slice(startIndex, startIndex + PROJECTS_PER_PAGE),
    [projects, startIndex],
  );
  const pageIndex = Math.floor(startIndex / PROJECTS_PER_PAGE) + 1;
  const pageCount = Math.max(1, Math.ceil(projects.length / PROJECTS_PER_PAGE));
  const prevDisabled = startIndex === 0;
  const nextDisabled = startIndex + PROJECTS_PER_PAGE >= projects.length;

  return (
    <section className="rounded-radius-lg border border-border bg-surface-container-lowest p-lg shadow-1">
      <div className="mb-md grid grid-cols-[auto_1fr_auto] items-center gap-sm">
        <h2 className="text-heading-3 font-semibold text-foreground">Project Progress</h2>
        <span className="text-small text-muted" aria-live="polite">
          Page {pageIndex} / {pageCount}
        </span>

        <div className="flex items-center gap-xs">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Previous project page"
            disabled={prevDisabled}
            onClick={() => setStartIndex((current) => Math.max(0, current - PROJECTS_PER_PAGE))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Next project page"
            disabled={nextDisabled}
            onClick={() =>
              setStartIndex((current) =>
                Math.min(Math.max(0, projects.length - 1), current + PROJECTS_PER_PAGE),
              )
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-radius-md border border-border bg-surface-container-low p-lg text-small text-muted">
          Loading project progress...
        </div>
      ) : isError ? (
        <div className="rounded-radius-md border border-danger/30 bg-danger/10 p-lg text-small text-danger">
          We couldn&apos;t load project progress right now.
        </div>
      ) : pageItems.length === 0 ? (
        <div className="rounded-radius-md border border-dashed border-border bg-surface-container-low p-lg text-center text-small text-muted">
          No active projects yet. Create a project to track progress.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((project) => (
            <article
              key={project.id}
              className="rounded-radius-md border border-border bg-transparent p-md"
            >
              <div className="mb-sm flex items-center justify-between gap-sm">
                <Link
                  to="/projects/$projectId/board"
                  params={{ projectId: project.id }}
                  className="line-clamp-1 text-body font-medium text-foreground hover:text-brand-primary hover:underline"
                >
                  {project.name}
                </Link>
                <strong className="text-small text-foreground">{project.progress}%</strong>
              </div>

              <Progress value={project.progress} className="h-2.5 border border-border" />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
