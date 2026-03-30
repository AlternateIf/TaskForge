import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-skeleton rounded-radius-md bg-surface-container-high', className)}
      {...props}
    />
  );
}

export { Skeleton };
