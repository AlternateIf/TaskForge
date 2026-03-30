import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { User } from 'lucide-react';
import { type ImgHTMLAttributes, forwardRef, useState } from 'react';

const AVATAR_COLORS = [
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#65A30D',
  '#16A34A',
  '#0D9488',
  '#0891B2',
  '#4F46E5',
  '#9333EA',
] as const;

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden',
  {
    variants: {
      size: {
        xs: 'size-5 text-[8px]',
        sm: 'size-6 text-[10px]',
        md: 'size-8 text-small',
        lg: 'size-10 text-body',
        xl: 'size-16 text-heading-2',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

interface AvatarProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size' | 'src'>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  name?: string;
  userId?: string;
  showPresence?: boolean;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, name, userId = '', size, showPresence, ...props }, ref) => {
    const [imgError, setImgError] = useState(false);
    const bgColor = getAvatarColor(userId);

    return (
      <div ref={ref} className={cn(avatarVariants({ size }), className)}>
        {src && !imgError ? (
          // biome-ignore lint/a11y/useAltText: alt is provided dynamically via name prop
          <img
            src={src}
            alt={name || 'User avatar'}
            className="size-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
            {...props}
          />
        ) : name ? (
          <span
            className="flex size-full items-center justify-center font-semibold text-white"
            style={{ backgroundColor: bgColor }}
            aria-label={name}
          >
            {getInitials(name)}
          </span>
        ) : (
          <span className="flex size-full items-center justify-center bg-surface-container-high text-muted">
            <User className="size-1/2" strokeWidth={2} />
          </span>
        )}
        {showPresence ? (
          <span className="absolute bottom-0 right-0 block size-1/4 min-h-1.5 min-w-1.5 rounded-full border-2 border-background bg-success" />
        ) : null}
      </div>
    );
  },
);
Avatar.displayName = 'Avatar';

export { Avatar, getAvatarColor, getInitials };
export type { AvatarProps };
