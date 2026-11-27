/**
 * Workspace controls: one button family for every toolbar, panel header and menu trigger.
 * 60-30-10: cream surfaces, brown text and 1px lines, olive (`brand`) only for the primary action,
 * the tool that is on, focus rings and status dots.
 */
export const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:active:translate-y-0';

/** Plain toolbar button (zoom, fit, view all). */
export const toolBtn = `${base} h-7 px-2 text-ink-2 hover:bg-muted hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-2`;

/** Two-state tool (comment mode, lights, ceiling, whole house): on = olive, like the active tool. Pair with aria-pressed. */
export const toggleBtn = (on: boolean) =>
  `${base} h-7 px-2 ${on ? 'bg-brand text-surface hover:bg-brand-hover' : 'text-ink-2 hover:bg-muted hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-2 aria-disabled:hover:bg-transparent aria-disabled:hover:text-ink-2'}`;

/** Square icon button: back, collapse, drawer openers. */
export const iconBtn = `${base} h-8 w-8 text-subtext hover:bg-muted hover:text-ink`;

/** Framed icon button floating on the canvas ("⋯", expand). */
export const floatIconBtn = `${base} h-8 w-8 border border-line bg-surface text-ink-2 shadow-card hover:bg-canvas hover:text-ink`;

/** Outline trigger for dropdowns (version, compare version, cut level). */
export const outlineBtn = `${base} h-7 border border-line bg-surface px-2 text-ink hover:border-line-strong hover:bg-canvas`;

/** Frame shared by every floating canvas bar. */
export const floatBar = 'rounded-lg border border-line bg-surface shadow-card';
