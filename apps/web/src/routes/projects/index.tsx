import { type Project, useProjects } from '@/api/projects';
import { CreateProjectDialog } from '@/components/forms/create-project-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useNavigate } from '@tanstack/react-router';
import { FolderOpen, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

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

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const members = project.members ?? [];
  const visibleMembers = members.slice(0, 3);
  const extraMembers = members.length - visibleMembers.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-radius-lg border border-border bg-surface-container-lowest p-lg shadow-1 text-left transition-shadow hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
      {project.description ? (
        <p className="mb-md line-clamp-2 flex-1 text-body text-secondary">{project.description}</p>
      ) : (
        <p className="mb-md flex-1 text-body italic text-muted">No description</p>
      )}

      {/* Footer: member avatars + task count */}
      <div className="flex items-center justify-between">
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
          {project.taskCount ?? 0} task{(project.taskCount ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FolderOpen className="mb-lg size-16 text-muted" strokeWidth={1} />
      <h2 className="mb-xs text-heading-2 font-semibold text-foreground">No projects yet</h2>
      <p className="mb-lg max-w-96 text-body text-secondary">
        Create your first project to start organizing tasks and collaborating with your team.
      </p>
      <Button variant="primary" onClick={onCreate}>
        <Plus className="size-4" />
        Create Project
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  useDocumentTitle('Projects');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();

  const filtered = useMemo(() => {
    if (!projects || !search.trim()) return projects ?? [];
    const q = search.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
    );
  }, [projects, search]);

  function handleProjectClick(projectId: string) {
    void navigate({ to: '/projects/$projectId', params: { projectId } });
  }

  function handleCreateSuccess(projectId: string) {
    void navigate({ to: '/projects/$projectId/board', params: { projectId } });
  }

  return (
    <div className="mx-auto max-w-screen-xl p-lg">
      {/* Page header */}
      <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-heading-1 font-bold text-foreground">Projects</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      {(projects?.length ?? 0) > 0 && (
        <div className="relative mb-lg max-w-96">
          <Search className="absolute left-sm top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest pl-9 pr-sm text-body focus:outline-2 focus:outline-ring"
            aria-label="Search projects"
          />
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_unused, index) => `project-skeleton-${index + 1}`).map(
            (key) => (
              <ProjectCardSkeleton key={key} />
            ),
          )}
        </div>
      ) : filtered.length === 0 && projects?.length === 0 ? (
        <EmptyProjects onCreate={() => setCreateOpen(true)} />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body text-muted">No projects match "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
