import { ShortcutOverlay } from '@/components/shortcuts/shortcut-overlay';
import {
  type RuntimeShortcut,
  detectShortcutScope,
  useShortcutsEngine,
} from '@/hooks/use-shortcuts';
import {
  GLOBAL_SHORTCUT_DEFINITIONS,
  OVERLAY_SHORTCUT_DEFINITIONS,
  type ShortcutScope,
} from '@taskforge/shared';
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface ShortcutContextValue {
  registerShortcut: (shortcut: RuntimeShortcut) => () => void;
  activeScope: ShortcutScope;
  overlayOpen: boolean;
  setOverlayOpen: (open: boolean) => void;
  scopeOverride: ShortcutScope | null;
  setScopeOverride: (scope: ShortcutScope | null) => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

interface ShortcutProviderProps extends PropsWithChildren {
  pathname: string;
}

export function ShortcutProvider({ pathname, children }: ShortcutProviderProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [scopeOverride, setScopeOverride] = useState<ShortcutScope | null>(null);
  const activeScope = useMemo(() => detectShortcutScope(pathname), [pathname]);

  const { registerShortcut } = useShortcutsEngine({
    activeScope,
    scopeOverride,
    overlayOpen,
  });

  useEffect(() => {
    const overlayToggle = GLOBAL_SHORTCUT_DEFINITIONS.find(
      (shortcut) => shortcut.id === 'global.show-shortcuts-overlay',
    );
    const unregisterOverlayToggle = registerShortcut({
      id: 'provider.show-shortcuts-overlay',
      scope: 'global',
      key: overlayToggle?.kind === 'single' ? overlayToggle.key : '?',
      modifiers: overlayToggle?.modifiers,
      preventDefault: true,
      handler: () => setOverlayOpen(true),
    });

    const overlayEscape = OVERLAY_SHORTCUT_DEFINITIONS.find(
      (shortcut) => shortcut.id === 'overlay.close',
    );
    const unregisterOverlayEscape = registerShortcut({
      id: 'provider.close-shortcuts-overlay',
      scope: 'overlay',
      key: overlayEscape?.kind === 'single' ? overlayEscape.key : 'escape',
      allowInInput: true,
      preventDefault: true,
      handler: () => setOverlayOpen(false),
    });

    return () => {
      unregisterOverlayToggle();
      unregisterOverlayEscape();
    };
  }, [registerShortcut]);

  const contextValue = useMemo<ShortcutContextValue>(
    () => ({
      registerShortcut,
      activeScope,
      overlayOpen,
      setOverlayOpen,
      scopeOverride,
      setScopeOverride,
    }),
    [activeScope, overlayOpen, registerShortcut, scopeOverride],
  );

  return (
    <ShortcutContext.Provider value={contextValue}>
      {children}
      <ShortcutOverlay
        open={overlayOpen}
        activeScope={scopeOverride ?? activeScope}
        onOpenChange={setOverlayOpen}
      />
    </ShortcutContext.Provider>
  );
}

export function useShortcutProvider() {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcutProvider must be used within ShortcutProvider');
  }
  return context;
}

interface UseRegisterShortcutOptions extends Omit<RuntimeShortcut, 'handler' | 'enabled'> {
  handler: () => void;
  enabled?: boolean;
}

export function useRegisterShortcut({
  id,
  scope,
  key,
  chord,
  modifiers,
  allowInInput,
  preventDefault,
  enabled = true,
  handler,
}: UseRegisterShortcutOptions) {
  const { registerShortcut } = useShortcutProvider();

  const stableHandler = useCallback(() => {
    if (!enabled) {
      return;
    }
    handler();
  }, [enabled, handler]);

  useEffect(() => {
    return registerShortcut({
      id,
      scope,
      key,
      chord,
      modifiers,
      allowInInput,
      preventDefault,
      enabled,
      handler: stableHandler,
    });
  }, [
    allowInInput,
    chord,
    enabled,
    id,
    key,
    modifiers,
    preventDefault,
    registerShortcut,
    scope,
    stableHandler,
  ]);
}
