import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge doesn't know that our custom @theme font-size tokens
// (text-heading-*, text-body, text-small, text-label, text-button, text-code)
// are font-size utilities — without this, they conflict with text-color classes
// like text-white and the color gets dropped.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-heading-1',
        'text-heading-2',
        'text-heading-3',
        'text-body',
        'text-small',
        'text-label',
        'text-button',
        'text-code',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
