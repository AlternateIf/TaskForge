export function AuthMobileHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-border/30 bg-surface-container-lowest px-xl py-md lg:hidden">
      <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-radius-lg bg-brand-primary">
        <span className="text-sm font-bold text-white">TF</span>
      </div>
      <span className="text-base font-bold tracking-tight text-foreground">TaskForge</span>
    </div>
  );
}
