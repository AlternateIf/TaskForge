import { ThemeProvider } from '@/components/theme-provider';

export function App() {
  return (
    <ThemeProvider>
      <a
        href="#main-content"
        className="fixed left-2 top-2 z-50 -translate-y-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <main id="main-content" className="min-h-screen bg-background text-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-secondary">TaskForge is loading...</p>
        </div>
      </main>
    </ThemeProvider>
  );
}
