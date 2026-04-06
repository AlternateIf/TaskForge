import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Conversions ─────────────────────────────────────────────────────────────

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / diff + 2) / 6;
    else h = ((r - g) / diff + 4) / 6;
  }
  return { h: h * 360, s: max === 0 ? 0 : diff / max, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number;
  let g: number;
  let b: number;
  switch (i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default:
      r = v;
      g = p;
      b = q;
  }
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const safe = isValidHex(value) ? value : '#3b82f6';
  const [hsv, setHsv] = useState(() => hexToHsv(safe));
  const [hexInput, setHexInput] = useState(safe);

  // Refs to avoid stale closures in pointer event handlers
  const hsvRef = useRef(hsv);
  const lastSentRef = useRef(safe);
  const onChangeRef = useRef(onChange);
  const slRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const slDragging = useRef(false);
  const hueDragging = useRef(false);

  useEffect(() => {
    hsvRef.current = hsv;
  }, [hsv]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync from parent only when value changes externally (not from our own onChange)
  useEffect(() => {
    if (isValidHex(value) && value !== lastSentRef.current) {
      const newHsv = hexToHsv(value);
      setHsv(newHsv);
      setHexInput(value);
      hsvRef.current = newHsv;
      lastSentRef.current = value;
    }
  }, [value]);

  const applyHsv = useCallback((newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    hsvRef.current = newHsv;
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setHexInput(hex);
    lastSentRef.current = hex;
    onChangeRef.current(hex);
  }, []);

  // ─── SL square ────────────────────────────────────────────────────────────

  const onSlDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      slDragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (slRef.current) {
        const rect = slRef.current.getBoundingClientRect();
        const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
        applyHsv({ ...hsvRef.current, s, v });
      }
    },
    [applyHsv],
  );

  const onSlMove = useCallback(
    (e: React.PointerEvent) => {
      if (!slDragging.current || !slRef.current) return;
      const rect = slRef.current.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      applyHsv({ ...hsvRef.current, s, v });
    },
    [applyHsv],
  );

  const onSlUp = useCallback(() => {
    slDragging.current = false;
  }, []);

  // ─── Hue bar ──────────────────────────────────────────────────────────────

  const onHueDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      hueDragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect();
        const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
        applyHsv({ ...hsvRef.current, h });
      }
    },
    [applyHsv],
  );

  const onHueMove = useCallback(
    (e: React.PointerEvent) => {
      if (!hueDragging.current || !hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
      applyHsv({ ...hsvRef.current, h });
    },
    [applyHsv],
  );

  const onHueUp = useCallback(() => {
    hueDragging.current = false;
  }, []);

  // ─── Hex input ────────────────────────────────────────────────────────────

  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHexInput(raw);
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    if (isValidHex(hex)) {
      const newHsv = hexToHsv(hex);
      setHsv(newHsv);
      hsvRef.current = newHsv;
      lastSentRef.current = hex;
      onChangeRef.current(hex);
    }
  }, []);

  const pureHue = hsvToHex(hsv.h, 1, 1);
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className={cn('flex select-none flex-col gap-sm', className)}>
      {/* Saturation/value square */}
      <div
        ref={slRef}
        className="relative aspect-[4/3] w-full cursor-crosshair overflow-hidden rounded-radius-md"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})`,
        }}
        onPointerDown={onSlDown}
        onPointerMove={onSlMove}
        onPointerUp={onSlUp}
        onPointerCancel={onSlUp}
      >
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      {/* Hue bar */}
      <div
        ref={hueRef}
        className="relative h-4 w-full cursor-ew-resize overflow-hidden rounded-full"
        style={{
          background:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
        onPointerDown={onHueDown}
        onPointerMove={onHueMove}
        onPointerUp={onHueUp}
        onPointerCancel={onHueUp}
      >
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      {/* Preview swatch + hex input */}
      <div className="flex items-center gap-sm">
        <div
          className="size-8 shrink-0 rounded-radius-md border border-border"
          style={{ backgroundColor: currentHex }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          className="h-8 flex-1 rounded-radius-md border border-border bg-surface-container-high px-sm font-mono text-label uppercase text-foreground focus:outline-2 focus:outline-ring"
          spellCheck={false}
          maxLength={7}
        />
      </div>
    </div>
  );
}
