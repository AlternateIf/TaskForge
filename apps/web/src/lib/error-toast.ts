import type { ExternalToast } from 'sonner';
import { toast } from 'sonner';

const shownErrors = new WeakSet<Error>();

function isWeakOrUnsafeMessage(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return true;

  if (/^something went wrong\.?$/i.test(normalized)) return true;
  if (/^internal server error\.?$/i.test(normalized)) return true;
  if (/stack\s*trace/i.test(normalized)) return true;
  return /\bat\s+\S+\s*\(.*:\d+:\d+\)/i.test(normalized);
}

export function getUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && !isWeakOrUnsafeMessage(error.message)) {
    return error.message.trim();
  }

  if (typeof error === 'string' && !isWeakOrUnsafeMessage(error)) {
    return error.trim();
  }

  return fallback;
}

export function showErrorToast(error: unknown, fallback: string, options?: ExternalToast): string {
  if (error instanceof Error) {
    if (shownErrors.has(error)) {
      return getUserFacingErrorMessage(error, fallback);
    }
    shownErrors.add(error);
  }

  const message = getUserFacingErrorMessage(error, fallback);
  toast.error(message, options);
  return message;
}
