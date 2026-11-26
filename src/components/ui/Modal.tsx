import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { t } from '@/i18n';
import { Z } from './zIndex';
import { holdForDialog } from './toastStore';

/**
 * Dialog: Esc, the backdrop and the × button close it; focus moves inside (to [autofocus] or the first field, not the
 * ×) and stays there with Tab. Opens with a short fade and lift (bottom sheet on phones); reduced motion: no movement.
 */
export function Modal({ title, onClose, children, footer, size = 'sm' }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => [...(box.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter((el) => !el.hasAttribute('disabled'));
    const first = box.current?.querySelector<HTMLElement>('[autofocus]') ?? focusables().find((el) => !el.hasAttribute('data-modal-close')) ?? focusables()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        const list = focusables();
        if (!list.length) return;
        const head = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === head) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); head.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    // on phones this dialog is a bottom sheet: toasts move to the top so they never cover its buttons
    const releaseToasts = holdForDialog();
    return () => { window.removeEventListener('keydown', onKey); releaseToasts(); previous?.focus?.(); };
  }, []);
  return (
    <div className={`modal-backdrop fixed inset-0 ${Z.modal} flex items-end justify-center bg-dark/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4`} onClick={onClose}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`modal-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-float sm:rounded-2xl ${size === 'lg' ? 'sm:max-w-4xl' : size === 'md' ? 'sm:max-w-xl' : 'sm:max-w-md'}`}>
        {/* Grab handle: reads as a sheet on phones */}
        <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3.5 pl-5 pr-3">
          <h2 className="pt-1 text-base font-semibold leading-snug text-ink">{title}</h2>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
