import { type Attachment, fetchAttachmentBlob } from '@/api/attachments';
import { FileDropzone } from '@/components/data/file-dropzone';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AttachmentListProps {
  attachments: Attachment[];
  uploadProgress: Array<{ filename: string; progress: number }>;
  onUploadFiles: (files: File[]) => void;
  onDeleteAttachment: (attachmentId: string) => void;
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return FileSpreadsheet;
  }
  if (mimeType.includes('zip')) return FileArchive;
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('word')) {
    return FileText;
  }
  return File;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  attachments,
  uploadProgress,
  onUploadFiles,
  onDeleteAttachment,
}: AttachmentListProps) {
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [lightboxAttachment, setLightboxAttachment] = useState<Attachment | null>(null);

  useEffect(() => {
    let isMounted = true;
    const objectUrls: string[] = [];

    async function loadPreviews() {
      const next: Record<string, string> = {};
      const images = attachments.filter((item) => isImage(item.mimeType));

      await Promise.all(
        images.map(async (item) => {
          try {
            const blob = await fetchAttachmentBlob(item.url);
            const previewUrl = URL.createObjectURL(blob);
            objectUrls.push(previewUrl);
            next[item.id] = previewUrl;
          } catch {
            // keep fallback icon when preview download fails
          }
        }),
      );

      if (isMounted) {
        setImagePreviewUrls(next);
      }
    }

    void loadPreviews();

    return () => {
      isMounted = false;
      for (const objectUrl of objectUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachments]);

  async function handleDownload(attachment: Attachment) {
    try {
      const blob = await fetchAttachmentBlob(attachment.url);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.filename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      toast.error(`Failed to download ${attachment.filename}`);
    }
  }

  return (
    <section className="space-y-sm">
      <h3 className="text-label font-bold uppercase tracking-widest text-secondary">Attachments</h3>

      <FileDropzone onFilesSelected={onUploadFiles} className="w-full p-md">
        <p className="text-small text-secondary">Drop files here or click to upload</p>
      </FileDropzone>

      {uploadProgress.length > 0 ? (
        <ul className="space-y-xs">
          {uploadProgress.map((item) => (
            <li key={item.filename} className="rounded-radius-md border border-border/20 p-sm">
              <div className="mb-xs flex items-center justify-between gap-sm text-small text-foreground">
                <span className="line-clamp-1">Uploading {item.filename}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-low">
                <div
                  className="h-full bg-gradient-to-r from-brand-primary to-accent"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="space-y-xs">
        {attachments.length === 0 ? (
          <li className="rounded-radius-md border border-dashed border-border p-sm text-small text-muted">
            No files attached.
          </li>
        ) : (
          attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mimeType);
            return (
              <li
                key={attachment.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-sm rounded-radius-md border border-border/20 bg-surface-container-low/40 p-sm"
              >
                {isImage(attachment.mimeType) ? (
                  imagePreviewUrls[attachment.id] ? (
                    <button
                      type="button"
                      className="rounded-radius-md border border-border/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      onClick={() => setLightboxAttachment(attachment)}
                      aria-label={`Preview ${attachment.filename}`}
                    >
                      <img
                        src={imagePreviewUrls[attachment.id]}
                        alt={attachment.filename}
                        className="size-10 rounded-radius-md object-cover"
                      />
                    </button>
                  ) : (
                    <span className="inline-flex size-10 items-center justify-center rounded-radius-md bg-surface-container-low text-muted">
                      <Icon className="size-5" />
                    </span>
                  )
                ) : (
                  <span className="inline-flex size-10 items-center justify-center rounded-radius-md bg-surface-container-low text-muted">
                    <Icon className="size-5" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  {isImage(attachment.mimeType) ? (
                    <button
                      type="button"
                      className="block w-full truncate text-left text-small font-semibold text-brand-primary underline decoration-transparent underline-offset-2 transition-colors hover:decoration-brand-primary"
                      onClick={() => setLightboxAttachment(attachment)}
                    >
                      {attachment.filename}
                    </button>
                  ) : (
                    <p className="truncate text-small font-medium text-foreground">
                      {attachment.filename}
                    </p>
                  )}
                  <p className="text-label text-secondary">{humanSize(attachment.sizeBytes)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-xs pl-xs">
                  <button
                    type="button"
                    onClick={() => void handleDownload(attachment)}
                    aria-label={`Download ${attachment.filename}`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  >
                    <Download className="size-4" />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${attachment.filename}`}
                    onClick={() => onDeleteAttachment(attachment.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <Dialog
        open={Boolean(lightboxAttachment)}
        onOpenChange={(open) => !open && setLightboxAttachment(null)}
      >
        <DialogContent className="max-w-[92vw] p-md">
          <DialogHeader className="pb-sm">
            <DialogTitle className="line-clamp-1 text-body">
              {lightboxAttachment?.filename}
            </DialogTitle>
          </DialogHeader>
          {lightboxAttachment ? (
            <div className="max-h-[76vh] overflow-auto rounded-radius-md border border-border/20 bg-surface-container-low p-xs">
              {imagePreviewUrls[lightboxAttachment.id] ? (
                <img
                  src={imagePreviewUrls[lightboxAttachment.id]}
                  alt={lightboxAttachment.filename}
                  className="mx-auto max-h-[72vh] w-auto max-w-full object-contain"
                />
              ) : (
                <p className="p-md text-small text-muted">Preview unavailable.</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
