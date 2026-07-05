'use client';
import { useEffect, useRef } from 'react';

// ── URL du site — à mettre à jour avec le vrai domaine ────────────
const SITE_URL = 'www.reussirtcf.ca';

// ── Filigrane diagonal répété ──────────────────────────────────────
export function ExamWatermark() {
  const rows = Array.from({ length: 10 });
  const cols = Array.from({ length: 5 });

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-10"
      style={{ userSelect: 'none' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '-50%',
          display: 'flex',
          flexDirection: 'column',
          gap: '48px',
          transform: 'rotate(-28deg)',
          opacity: 0.045,
        }}
      >
        {rows.map((_, r) => (
          <div key={r} style={{ display: 'flex', gap: '40px', whiteSpace: 'nowrap' }}>
            {cols.map((_, c) => (
              <span
                key={c}
                style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontWeight: 900,
                  fontSize: '18px',
                  color: '#6d28d9',
                  letterSpacing: '0.08em',
                  userSelect: 'none',
                }}
              >
                📖 {SITE_URL}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Signature au bas du contenu ────────────────────────────────────
export function ExamSignature() {
  return (
    <div
      className="select-none pointer-events-none"
      style={{ userSelect: 'none' }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-center gap-2 py-2 border-t border-violet-100">
        <span className="text-violet-300 text-xs">📖</span>
        <span className="text-xs text-violet-400 font-bold tracking-wide">{SITE_URL}</span>
      </div>
    </div>
  );
}

// ── Hook : bloque copier/coller/clic droit sur un élément ──────────
export function useExamProtection(enabled = true) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener('copy',          block);
    el.addEventListener('cut',           block);
    el.addEventListener('contextmenu',   block);
    el.addEventListener('selectstart',   block);
    el.addEventListener('dragstart',     block);

    return () => {
      el.removeEventListener('copy',        block);
      el.removeEventListener('cut',         block);
      el.removeEventListener('contextmenu', block);
      el.removeEventListener('selectstart', block);
      el.removeEventListener('dragstart',   block);
    };
  }, [enabled]);

  return ref;
}
