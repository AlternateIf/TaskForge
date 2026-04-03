import { apiClient } from '@/api/client';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    totalCount?: number;
  };
}

export interface SearchTaskHit {
  id: string;
  title: string;
  description?: string | null;
  statusName?: string | null;
  priority?: string | null;
  assigneeName?: string | null;
  projectId: string;
  projectName?: string | null;
}

export interface SearchProjectHit {
  id: string;
  name: string;
  description?: string | null;
}

export interface SearchCommentHit {
  id: string;
  body: string;
  taskId?: string | null;
  projectId?: string | null;
  authorName?: string | null;
}

export interface GlobalSearchResponse {
  tasks: {
    hits: SearchTaskHit[];
    totalHits: number;
  };
  projects: {
    hits: SearchProjectHit[];
    totalHits: number;
  };
  comments: {
    hits: SearchCommentHit[];
    totalHits: number;
  };
}

export async function searchGlobal(
  query: string,
  projectId?: string,
  organizationId?: string,
): Promise<GlobalSearchResponse> {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', '100');
  params.set('type', 'task,project');
  if (projectId) {
    params.set('projectId', projectId);
  }
  if (organizationId) {
    params.set('organizationId', organizationId);
  }

  return apiClient
    .get<ApiEnvelope<GlobalSearchResponse>>(`/search?${params.toString()}`)
    .then((r) => r.data);
}
