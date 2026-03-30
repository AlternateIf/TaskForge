import { queryClient } from '@/api/client';
import { ThemeProvider } from '@/components/theme-provider';
import { router } from '@/router';
import { useAuthStore } from '@/stores/auth.store';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

function AuthExpiredListener() {
  const { clearAuth } = useAuthStore();

  useEffect(() => {
    function handleExpired() {
      clearAuth();
      void router.navigate({ to: '/auth/login', search: { redirect: undefined } });
    }
    window.addEventListener('tf:auth:expired', handleExpired);
    return () => window.removeEventListener('tf:auth:expired', handleExpired);
  }, [clearAuth]);

  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthExpiredListener />
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: 'bg-surface-container-lowest border border-border text-foreground shadow-2',
              title: 'text-foreground text-body',
              description: 'text-muted text-small',
              actionButton: 'bg-brand-primary text-white',
              cancelButton: 'bg-surface-container-low text-foreground',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
