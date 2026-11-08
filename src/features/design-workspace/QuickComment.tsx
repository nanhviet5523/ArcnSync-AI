import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui';
import { t } from '@/i18n';

const WIDTH = 300;
const HEIGHT = 176;
const GAP = 12;

interface Props {
  title: string;
  /** Click position relative to the canvas container. */
  x: number;
  y: number;
  /** Canvas size, to keep the popover inside it. */
  bounds: { width: number; height: number };
  /** Resolves true when the comment was created; the popover then closes. */
  onSend: (text: string) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Small hint shown where the user clicked an empty spot in 3D while in comment mode (3D has no spot pins).
 * The caller hides it after a few seconds or on Esc.
 */
export function CommentHint({ x, y, bounds, onSwitch2D }: { x: number; y: number; bounds: { width: number; height: number }; onSwitch2D: () => void }) {
  const width = 280, height = 92;
  const left = Math.max(GAP, Math.min(x + GAP + width > bounds.width ? x - GAP - width : x + GAP, bounds.width - width - GAP));
  const top = Math.max(GAP, Math.min(y + GAP + height > bounds.height ? y - GAP - height : y + GAP, bounds.height - height - GAP));
  return (
    <div role="status" aria-live="polite" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      className="absolute z-30 rounded-card border border-line bg-surface px-3 py-2.5 shadow-float" style={{ left, top, width }}>
      <p className="text-[13px] leading-5 text-slate-700">{t('ws.hint3dSpot')}</p>
      <Button size="sm" className="mt-2" onClick={onSwitch2D}>{t('ws.switchTo2d')}</Button>
    </div>
  );
}

/** Comment box opened right where the user clicked in comment mode. Enter sends, Shift+Enter adds a line, Esc cancels. */
export function QuickComment({ title, x, y, bounds, onSend, onCancel }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { area.current?.focus(); }, []);

  // open to the lower right of the click, flipping when it would leave the canvas
  const left = Math.max(GAP, Math.min(x + GAP + WIDTH > bounds.width ? x - GAP - WIDTH : x + GAP, bounds.width - WIDTH - GAP));
  const top = Math.max(GAP, Math.min(y + GAP + HEIGHT > bounds.height ? y - GAP - HEIGHT : y + GAP, bounds.height - HEIGHT - GAP));

  const send = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    const ok = await onSend(value);
    if (!ok) setBusy(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
    else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  return (
    <div role="dialog" aria-label={title} onKeyDown={onKey} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      className="absolute z-30 rounded-card border border-line bg-surface p-3 shadow-float" style={{ left, top, width: WIDTH }}>
      <p className="mb-2 truncate text-[13px] font-semibold text-slate-900">{title}</p>
      <textarea ref={area} rows={3} value={text} disabled={busy} onChange={(e) => setText(e.target.value)}
        aria-label={title} placeholder={t('comments.placeholder')}
        className="block w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{t('ws.quickHint')}</span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button size="sm" variant="primary" loading={busy} disabled={!text.trim()} onClick={send}>{t('comments.send')}</Button>
        </div>
      </div>
    </div>
  );
}
