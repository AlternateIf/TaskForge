import { cn } from '@/lib/utils';
import { CloudUpload } from 'lucide-react';
import { type DragEvent, type HTMLAttributes, forwardRef, useCallback, useState } from 'react';

interface FileDropzoneProps extends HTMLAttributes<HTMLButtonElement> {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

const FileDropzone = forwardRef<HTMLButtonElement, FileDropzoneProps>(
  ({ className, onFilesSelected, accept, multiple = true, children, ...props }, ref) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = useCallback((e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) onFilesSelected?.(files);
      },
      [onFilesSelected],
    );

    const handleClick = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      if (accept) input.accept = accept;
      input.multiple = multiple;
      input.onchange = () => {
        const files = Array.from(input.files ?? []);
        if (files.length > 0) onFilesSelected?.(files);
      };
      input.click();
    }, [accept, multiple, onFilesSelected]);

    return (
      <button
        ref={ref}
        type="button"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-sm rounded-radius-lg border-2 border-dashed border-border p-xl text-center transition-colors',
          'hover:border-brand-primary hover:bg-brand-primary/5',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          isDragOver && 'border-brand-primary bg-brand-primary/5',
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <CloudUpload className="size-8 text-muted" strokeWidth={1.5} />
            <p className="text-small text-secondary">Drop files here or click to upload</p>
          </>
        )}
      </button>
    );
  },
);
FileDropzone.displayName = 'FileDropzone';

export { FileDropzone };
