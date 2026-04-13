import { apiClient } from '@/api/client';
import { showErrorToast } from '@/lib/error-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    totalCount?: number;
  };
}

export type CommentVisibility = 'public' | 'internal';

export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  authorDisplayName: string;
  body: string;
  visibility: CommentVisibility;
  parentCommentId: string | null;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCommentInput {
  body: string;
  parentCommentId?: string;
  visibility?: CommentVisibility;
}

export const commentKeys = {
  all: ['comments'] as const,
  byTask: (taskId: string) => [...commentKeys.all, 'task', taskId] as const,
};

export function useComments(taskId: string) {
  return useQuery({
    queryKey: commentKeys.byTask(taskId),
    queryFn: () =>
      apiClient.get<ApiEnvelope<Comment[]>>(`/tasks/${taskId}/comments`).then((r) => r.data),
    enabled: !!taskId,
  });
}

export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      apiClient.post<ApiEnvelope<Comment>>(`/tasks/${taskId}/comments`, input).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentKeys.byTask(taskId) });
      void queryClient.invalidateQueries({ queryKey: ['activity', 'task', taskId] });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to post comment. Please try again.', {
        id: 'create-comment-error',
      });
    },
  });
}
