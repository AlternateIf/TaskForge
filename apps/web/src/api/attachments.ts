import { type ApiError, apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    totalCount?: number;
  };
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: string;
  url: string;
  createdAt: string;
}

export interface UploadAttachmentInput {
  taskId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export const attachmentKeys = {
  all: ['attachments'] as const,
  byTask: (taskId: string) => [...attachmentKeys.all, 'task', taskId] as const,
};

export function resolveAttachmentUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
      const apiOrigin = new URL(API_BASE).origin;
      return `${apiOrigin}${url}`;
    }
    return `${window.location.origin}${url}`;
  }

  return `${window.location.origin}${API_BASE}/${url}`;
}

export async function fetchAttachmentBlob(url: string): Promise<Blob> {
  const token = useAuthStore.getState().token;
  const response = await fetch(resolveAttachmentUrl(url), {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error('Failed to load attachment');
  }

  return response.blob();
}

function uploadAttachment({
  file,
  taskId,
  onProgress,
}: UploadAttachmentInput): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('entityType', 'task');
    formData.append('entityId', taskId);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/attachments`);
    xhr.withCredentials = true;

    const token = useAuthStore.getState().token;
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress?.(progress);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as ApiEnvelope<Attachment>;
          resolve(parsed.data);
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
        return;
      }

      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string };
        const error = new Error(parsed.message ?? 'Upload failed') as ApiError;
        error.status = xhr.status;
        reject(error);
      } catch {
        const error = new Error('Upload failed') as ApiError;
        error.status = xhr.status;
        reject(error);
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error while uploading file'));
    });

    xhr.send(formData);
  });
}

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: attachmentKeys.byTask(taskId),
    queryFn: () =>
      apiClient.get<ApiEnvelope<Attachment[]>>(`/tasks/${taskId}/attachments`).then((r) => r.data),
    enabled: !!taskId,
  });
}

export function useUploadFile(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UploadAttachmentInput, 'taskId'>) =>
      uploadAttachment({ ...input, taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
      void queryClient.invalidateQueries({ queryKey: ['activity', 'task', taskId] });
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) => apiClient.delete(`/attachments/${attachmentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
      void queryClient.invalidateQueries({ queryKey: ['activity', 'task', taskId] });
    },
  });
}
