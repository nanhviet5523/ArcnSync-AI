import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { t } from '@/i18n';
import { HouseSticker } from './HouseSticker';
import { Z } from './zIndex';
import { DURATION, getDialogCount, getToasts, subscribe, toast } from './toastStore';
import type { ToastItem, ToastTone } from './toastStore';

/** Space between toasts once the stack opens (room for the sticker that sticks out above each card). */
const GAP = 20;
/** How much of each older toast shows behind the front one while the stack is closed. */
const PEEK = 12;
/** Toasts drawn at once; a fourth waits invisible behind them. */
const VISIBLE = 3;
/** Height used until a toast has been measured. */
const FALLBACK_H = 62;

// --- browser state read with useSyncExternalStore (no setState in effects) ---
const PHONE = '(max-width: 639px)';
const subscribePhone = (cb: () => void) => {
  const query = window.matchMedia?.(PHONE);
  query?.addEventListener('change', cb);
  return () => query?.removeEventListener('change', cb);
};
const isPhone = () => !!window.matchMedia?.(PHONE).matches;
const subscribeVisibility = (cb: () => void) => {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
};
const isHidden = () => document.visibilityState === 'hidden';

/** A tone's colours from the palette (--tone-ok, --tone-ok-soft, --tone-ok-line in globals.css). */
const toneVars = (name: 'ok' | 'info' | 'warn' | 'bad') =>
  ({ '--tone': `var(--tone-${name})`, '--tone-soft': `var(--tone-${name}-soft)`, '--tone-line': `var(--tone-${name}-line)` }) as CSSProperties;

/** Badge glyphs draw themselves in (toast-draw) once the sticker has landed. */
const TONE: Record<ToastTone, { vars: CSSProperties; motion: string; glyph: ReactNode }> = {
  success: {
    vars: toneVars('ok'), motion: 'toast-pop',
    glyph: <path d="M6.5 12.5l3.75 3.75L17.5 9" pathLength={1} className="toast-draw" />,
  },
  error: {
    vars: toneVars('bad'), motion: 'toast-shake',
    glyph: <><path d="M8.5 8.5l7 7" pathLength={1} className="toast-draw" /><path d="M15.5 8.5l-7 7" pathLength={1} className="toast-draw toast-draw-late" /></>,
  },
  warning: {
    vars: toneVars('warn'), motion: 'toast-pop',
    glyph: <><path d="M12 6.5v7" pathLength={1} className="toast-draw" /><circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none" /></>,
  },
  info: {
    vars: toneVars('info'), motion: 'toast-pop',
    glyph: <><circle cx="12" cy="6.8" r="1.4" fill="currentColor" stroke="none" /><path d="M12 10.5v7" pathLength={1} className="toast-draw" /></>,
  },
};

/** The garden-house sticker slapped on the card's top-left corner, with the tone badge on its corner. */
function StickerCorner({ tone, stamp, hidden }: { tone: ToastTone; stamp: number; hidden: boolean }) {
  const { motion: entrance, glyph } = TONE[tone];
  return (
    <span aria-hidden className={`pointer-events-none absolute -left-3 -top-4 z-10 h-[60px] w-[60px] transition-[opacity,translate] duration-300 group-hover:-translate-y-1 motion-reduce:transition-none ${hidden ? 'opacity-0' : ''}`}>
      {/* re-keyed so a toast shown again under the same id slaps its sticker on again */}
      <span key={stamp} className="sticker-slap relative block h-full w-full rotate-[-8deg]">
        <HouseSticker className="h-full w-full" />
        <span className={`absolute -bottom-0.5 -right-1 grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--tone)] text-white shadow-[0_2px_4px_rgb(43_36_24/0.3)] ring-2 ring-[#FFFDF8] ${entrance}`}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {glyph}
          </svg>
        </span>
      </span>
    </span>
  );
}

interface CardProps {
  item: ToastItem;
  index: number;
  count: number;
  /** Distance from the anchored edge, px. */
  offset: number;
  expanded: boolean;
  paused: boolean;
  anchorTop: boolean;
  frontHeight: number;
  height: number | undefined;
  reduceMotion: boolean;
  onHeight: (id: string, height: number) => void;
}

function ToastCard({ item, index, count, offset, expanded, paused, anchorTop, frontHeight, height, reduceMotion, onHeight }: CardProps) {
  const duration = item.duration ?? DURATION[item.tone];
  const timed = Number.isFinite(duration) && duration > 0;
  const front = index === 0;
  // Older toasts, stack closed: a card shell the front one's size, content hidden.
  const tucked = !expanded && !front;

  // Countdown with the time left kept across pauses; restarts when shown again under the same id.
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  useEffect(() => { remaining.current = duration; }, [item.stamp, duration]);
  useEffect(() => {
    if (!timed || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [timed, paused, item.id, item.stamp]);

  // Natural height of the content, reported up so the stack can lay the toasts out.
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = content.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => onHeight(item.id, el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.id, onHeight]);

  // Swipe sideways to dismiss: the card fades as it travels.
  const x = useMotionValue(0);
  const swipeOpacity = useTransform(x, [-160, 0, 160], [0, 1, 0]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) toast.dismiss(item.id);
  };

  const dir = anchorTop ? 1 : -1;
  const enterFrom = anchorTop ? -56 : 56;

  return (
    <motion.li
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: enterFrom, scale: 0.9 }}
      animate={{
        opacity: index >= VISIBLE ? 0 : 1,
        y: dir * offset,
        scale: expanded || reduceMotion ? 1 : 1 - index * 0.05,
      }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
      onKeyDown={(e) => { if (e.key === 'Escape') toast.dismiss(item.id); }}
      className="absolute inset-x-0"
      style={{ [anchorTop ? 'top' : 'bottom']: 0, zIndex: count - index, transformOrigin: anchorTop ? 'bottom center' : 'top center' }}
    >
      <motion.div
        drag={expanded || front ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={onDragEnd}
        animate={{ height: tucked ? frontHeight : height ?? 'auto' }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        style={{ x, opacity: swipeOpacity, ...TONE[item.tone].vars }}
        className="group relative cursor-grab touch-pan-y active:cursor-grabbing"
      >
        <StickerCorner tone={item.tone} stamp={item.stamp} hidden={tucked} />

        {/* the card: the tone's soft fill and border, a paper sheen from the top-left */}
        <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--tone-line)] bg-[var(--tone-soft)] shadow-[0_14px_34px_-14px_rgb(43_36_24/0.4)]">
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/80 via-white/25 to-transparent" />
          <div ref={content} role={item.tone === 'error' ? 'alert' : 'status'}
            className={`relative flex min-h-[62px] items-center py-3 pl-[68px] pr-10 transition-opacity duration-200 ${tucked ? 'opacity-0' : 'opacity-100'}`}>
            <div className="min-w-0 flex-1">
              {item.title && <p className="text-sm font-semibold text-ink">{item.title}</p>}
              <p className={`break-words text-[13px] leading-snug ${item.title ? 'mt-0.5 text-ink-2' : 'font-medium text-ink'}`}>{item.message}</p>
              {item.action && (
                <button
                  type="button"
                  onClick={() => { item.action?.onClick(); toast.dismiss(item.id); }}
                  className="mt-2 inline-flex h-7 cursor-pointer items-center rounded-full bg-[var(--tone)] px-3 text-xs font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone)]"
                >
                  {item.action.label}
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(item.id)}
            aria-label={t('common.close')}
            tabIndex={tucked ? -1 : 0}
            className={`absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-subtext-2 transition hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-[var(--tone)] ${tucked ? 'opacity-0' : ''}`}
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
          {/* countdown: drains left to right in the tone colour, holds while paused */}
          {timed && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]">
              <span key={item.stamp} className="toast-countdown block h-full origin-left bg-[var(--tone)] opacity-50"
                style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
            </span>
          )}
        </div>
      </motion.div>
    </motion.li>
  );
}

/**
 * Mount once at the app root. Each toast is a soft card in its tone's palette colours with a garden-house sticker
 * on its top-left corner (HouseSticker). Toasts sit at the bottom centre, clear of the header menus (account, notifications) and
 * the call popups at the bottom right. On phones, while a dialog (bottom sheet) is open, they move to the top.
 * Several at once stack like a deck, newest in front; hovering or tabbing into the stack fans it out and holds every
 * countdown (as does a hidden tab). Dismiss: ×, swipe sideways, or Esc on a focused toast.
 */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, getToasts, getToasts);
  const dialogs = useSyncExternalStore(subscribe, getDialogCount, getDialogCount);
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const hidden = useSyncExternalStore(subscribeVisibility, isHidden, () => false);
  const reduceMotion = !!useReducedMotion();
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  // The last toast went away under the pointer (or focus): no leave event comes, so start fresh for the next one.
  if (!list.length && (hovered || focused)) {
    setHovered(false);
    setFocused(false);
  }

  const onHeight = useCallback((id: string, height: number) => {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  }, []);

  const anchorTop = phone && dialogs > 0;
  const expanded = (hovered || focused) && list.length > 1;
  const paused = hovered || focused || hidden;
  const heightOf = (item: ToastItem) => heights[item.id] ?? FALLBACK_H;
  const shown = list.slice(0, VISIBLE);

  // Each toast's distance from the anchored edge: stacked peeks when closed, one after another when open.
  const offsets = list.map((_, i) => (expanded
    ? list.slice(0, i).reduce((sum, item) => sum + heightOf(item) + GAP, 0)
    : Math.min(i, VISIBLE - 1) * PEEK));
  const stackHeight = !list.length ? 0
    : expanded ? shown.reduce((sum, item) => sum + heightOf(item), 0) + GAP * (shown.length - 1)
      : heightOf(list[0]) + PEEK * (shown.length - 1);

  return (
    <section
      aria-label={t('toast.region')}
      className={`pointer-events-none fixed inset-x-0 ${Z.toast} flex justify-center px-4 ${anchorTop ? 'top-6' : 'bottom-4 sm:bottom-6'}`}
    >
      <ol
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}
        className={`relative w-full max-w-[380px] ${list.length ? 'pointer-events-auto' : ''}`}
        style={{ height: stackHeight, transition: reduceMotion ? undefined : 'height 300ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <AnimatePresence initial={false}>
          {list.map((item, i) => (
            <ToastCard
              key={item.id}
              item={item}
              index={i}
              count={list.length}
              offset={offsets[i]}
              expanded={expanded}
              paused={paused}
              anchorTop={anchorTop}
              frontHeight={heightOf(list[0])}
              height={heights[item.id]}
              reduceMotion={reduceMotion}
              onHeight={onHeight}
            />
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
