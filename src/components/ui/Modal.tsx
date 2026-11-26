import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Z } from './zIndex';

/** Dialog: Esc and the backdrop close it, focus moves inside and stays there with Tab. */
export function Modal({ title, onClose, children, footer, size = 'sm' }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => [...(box.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter((el) => !el.hasAttribute('disabled'));
    (box.current?.querySelector<HTMLElement>('[autofocus]') ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        const list = focusables();
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, []);
  return (
    <div className={`fixed inset-0 ${Z.modal} flex items-end justify-center bg-dark/40 p-0 sm:items-center sm:p-4`} onClick={onClose}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:rounded-xl ${size === 'lg' ? 'sm:max-w-4xl' : size === 'md' ? 'sm:max-w-xl' : 'sm:max-w-md'}`}>
        <h2 className="border-b border-slate-100 px-5 py-4 text-[15px] font-semibold text-ink">{title}</h2>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
