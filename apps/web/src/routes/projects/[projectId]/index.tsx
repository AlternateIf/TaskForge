import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

interface ProjectIndexProps {
  projectId: string;
}

/** Redirects to board or list based on user's saved view preference */
export function ProjectIndexPage({ projectId }: ProjectIndexProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(`tf:project:${projectId}:view`);
    const view = saved === 'list' ? 'list' : 'board';
    void navigate({
      to: view === 'list' ? '/projects/$projectId/list' : '/projects/$projectId/board',
      params: { projectId },
      replace: true,
    });
  }, [projectId, navigate]);

  return null;
}
