import { type Project, useProjectsPage } from '@/api/projects';
import { CreateProjectDialog } from '@/components/forms/create-project-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from '@tanstack/react-router';
import { PROJECT_CREATE_PERMISSION, PROJECT_READ_PERMISSION } from '@taskforge/shared';
import { FolderOpen, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

type ProjectTab = 'active' | 'finished';

function normalizeProjectDescription(description?: string | null): string {
  if (!description) return '';
  return description
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateDescription(description?: string | null): string {
  const normalized = normalizeProjectDescription(description);
  if (!normalized) return 'No description';
  return normalized.length > 200 ? `${normalized.slice(0, 200)}...` : normalized;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProjectCardSkeleton() {
  return (
    <div className="rounded-radius-lg border border-border bg-surface-container-lowest p-lg shadow-1">
      <div className="mb-sm flex items-center gap-sm">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-5 w-3/4 rounded" />
      </div>
      <Skeleton className="mb-lg h-4 w-full rounded" />
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="size-7 rounded-full ring-2 ring-background" />
          ))}
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const members = project.members ?? [];
  const visibleMembers = members.slice(0, 3);
  const extraMembers = members.length - visibleMembers.length;
  const totalTaskCount = project.taskCount ?? 0;
  const completedTaskCount =
    typeof project.completedTaskCount === 'number'
      ? project.completedTaskCount
      : typeof project.openTaskCount === 'number'
        ? Math.max(totalTaskCount - project.openTaskCount, 0)
        : undefined;

  const taskProgressLabel =
    typeof completedTaskCount === 'number'
      ? `${completedTaskCount} / ${totalTaskCount} Tasks complete`
      : `${totalTaskCount} Tasks`;

  return (
    <button
      type="button"
      className="group flex w-full cursor-pointer flex-col rounded-radius-lg border border-border bg-surface-container-lowest p-lg text-left shadow-1 transition-shadow hover:shadow-2 focus-visible:outline-2 focus-visible:outline-ring"
      onClick={onOpen}
      aria-label={`Open ${project.name} board`}
    >
      {/* Name + color dot */}
      <div className="mb-xs flex items-center gap-sm">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color ?? undefined }}
          aria-hidden
        />
        <h2 className="line-clamp-1 text-heading-3 font-semibold text-foreground group-hover:text-brand-primary">
          {project.name}
        </h2>
      </div>

      {/* Description */}
      <p className="mb-md min-h-12 flex-1 text-body text-secondary">
        {truncateDescription(project.description)}
      </p>

      {/* Footer: member avatars + task count */}
      <div className="mb-md flex items-center justify-between">
        <div
          className="flex -space-x-2"
          aria-label={`${project.memberCount ?? members.length} members`}
        >
          {visibleMembers.map((m) => (
            <Avatar
              key={m.userId}
              name={m.displayName}
              userId={m.userId}
              size="sm"
              className="ring-2 ring-background"
            />
          ))}
          {extraMembers > 0 && (
            <span className="flex size-7 items-center justify-center rounded-full bg-surface-container text-label font-medium text-secondary ring-2 ring-background">
              +{extraMembers}
            </span>
          )}
        </div>
        <span className="rounded-full bg-surface-container px-sm py-0.5 text-label text-secondary">
          {taskProgressLabel}
        </span>
      </div>
    </button>
  );
}

function SectionPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mt-md flex flex-wrap items-center justify-between gap-sm">
      <span className="text-label text-secondary" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-xs">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </Button>
        {pageNumbers.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === page ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyProjects({ onCreate, canCreate }: { onCreate: () => void; canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FolderOpen className="mb-lg size-16 text-muted" strokeWidth={1} />
      <h2 className="mb-xs text-heading-2 font-semibold text-foreground">No projects yet</h2>
      <p className="mb-lg max-w-96 text-body text-secondary">
        Create your first project to start organizing tasks and collaborating with your team.
      </p>
      {canCreate && (
        <Button variant="primary" onClick={onCreate}>
          <Plus className="size-4" />
          Create Project
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  useDocumentTitle('Projects');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>('active');
  const [activePage, setActivePage] = useState(1);
  const [finishedPage, setFinishedPage] = useState(1);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canReadProjects = permissionSet.has(PROJECT_READ_PERMISSION);
  const canCreateProjects = permissionSet.has(PROJECT_CREATE_PERMISSION);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const trimmedSearch = debouncedSearch.trim() || undefined;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const activeProjectsQuery = useProjectsPage({
    status: 'active',
    search: trimmedSearch,
    page: activePage,
    limit: activeTab === 'active' ? PAGE_SIZE : 1,
    enabled: canReadProjects,
  });
  const finishedProjectsQuery = useProjectsPage({
    status: 'archived',
    search: trimmedSearch,
    page: finishedPage,
    limit: activeTab === 'finished' ? PAGE_SIZE : 1,
    enabled: canReadProjects,
  });

  const activeTotal = activeProjectsQuery.data?.totalCount ?? 0;
  const finishedTotal = finishedProjectsQuery.data?.totalCount ?? 0;
  const totalAcrossTabs = activeTotal + finishedTotal;

  const currentQuery = activeTab === 'active' ? activeProjectsQuery : finishedProjectsQuery;
  const currentProjects = currentQuery.data?.items ?? [];
  const currentTotal = currentQuery.data?.totalCount ?? 0;
  const currentPage = activeTab === 'active' ? activePage : finishedPage;
  const totalPages = Math.max(1, Math.ceil(currentTotal / PAGE_SIZE));

  useEffect(() => {
    if (canReadProjects) return;
    toast.error('You do not have access to project task views.');
    void navigate({ to: '/dashboard', replace: true });
  }, [canReadProjects, navigate]);

  useEffect(() => {
    if (!currentQuery.data || currentQuery.isLoading || currentQuery.isFetching) return;
    if (currentPage <= totalPages) return;
    if (activeTab === 'active') {
      setActivePage(totalPages);
    } else {
      setFinishedPage(totalPages);
    }
  }, [
    activeTab,
    currentPage,
    currentQuery.data,
    currentQuery.isFetching,
    currentQuery.isLoading,
    totalPages,
  ]);

  if (!canReadProjects) {
    return null;
  }

  function handleProjectClick(projectId: string) {
    void navigate({
      to: '/projects/$projectId/board',
      params: { projectId },
      search: { task: undefined },
    });
  }

  function handleCreateSuccess(projectId: string) {
    void navigate({
      to: '/projects/$projectId/board',
      params: { projectId },
      search: { task: undefined },
    });
  }

  return (
    <div className="mx-auto max-w-screen-xl p-lg">
      {/* Page header */}
      <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-heading-1 font-bold text-foreground">Projects</h1>
        {canCreateProjects && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Search */}
      {(totalAcrossTabs > 0 || search.length > 0) && (
        <div className="relative mb-lg max-w-96">
          <Search className="absolute left-sm top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActivePage(1);
              setFinishedPage(1);
            }}
            className="h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest pl-9 pr-sm text-body focus:outline-2 focus:outline-ring"
            aria-label="Search projects"
          />
        </div>
      )}

      {totalAcrossTabs > 0 && (
        <div
          className="mb-lg inline-flex rounded-radius-lg border border-border bg-surface-container-low p-xs"
          role="tablist"
          aria-label="Project status"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            className={
              activeTab === 'active'
                ? 'rounded-radius-md bg-brand-primary/15 px-md py-xs text-brand-primary'
                : 'rounded-radius-md px-md py-xs text-secondary hover:text-foreground'
            }
          >
            Active Projects ({activeTotal})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'finished'}
            onClick={() => setActiveTab('finished')}
            className={
              activeTab === 'finished'
                ? 'rounded-radius-md bg-brand-primary/15 px-md py-xs text-brand-primary'
                : 'rounded-radius-md px-md py-xs text-secondary hover:text-foreground'
            }
          >
            Finished/Closed Projects ({finishedTotal})
          </button>
        </div>
      )}

      {/* Grid */}
      {currentQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_unused, index) => `project-skeleton-${index + 1}`).map(
            (key) => (
              <ProjectCardSkeleton key={key} />
            ),
          )}
        </div>
      ) : totalAcrossTabs === 0 && !search.trim() ? (
        <EmptyProjects onCreate={() => setCreateOpen(true)} canCreate={canCreateProjects} />
      ) : currentTotal === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body text-muted">
            {activeTab === 'active'
              ? search.trim()
                ? 'No active projects match your search.'
                : 'No active projects yet.'
              : search.trim()
                ? 'No finished projects match your search.'
                : 'No finished projects yet.'}
          </p>
        </div>
      ) : (
        <section aria-live="polite">
          <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
            {currentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => handleProjectClick(project.id)}
              />
            ))}
          </div>
          <SectionPagination
            page={currentPage}
            totalPages={totalPages}
            onChange={activeTab === 'active' ? setActivePage : setFinishedPage}
          />
        </section>
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
