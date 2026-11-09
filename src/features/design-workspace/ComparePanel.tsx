import { useEffect, useMemo, useState } from 'react';
import { ErrorState, Skeleton } from '@/components/ui';
import { errorText, t } from '@/i18n';
import { designApi } from './designApi';
import type { DiffKind } from './logic';
import { DIFF_COLORS, versionLabel } from './logic';
import { Plan2D } from './Plan2D';
import type { Layers, Plan2DHandle, ViewBox } from './Plan2D';
import { mergeComparison } from './roomDrafts';
import type { ChangeLine } from './roomDrafts';
import type { DesignElement, DesignVersion, VersionComparison } from './types';
import type { Ref } from 'react';

/** Compare with a result that is not a version yet: the items after merging, on the right. */
export interface MergePreview {
  base: DesignVersion;
  elements: DesignElement[];
  lines: ChangeLine[];
  selectedId: string | null;
  onPick: (elementId: string) => void;
}

interface Props {
  merge?: MergePreview;
  /** Viewer role: homeowners read "Design 3", designers "v3". */
  role: string;
  /** Older version on the left, the version being viewed on the right (same stage). */
  fromId: string;
  toId: string;
  floorId: string;
  layers: Layers;
  /** Shared 2D view: both halves pan and zoom together. */
  view: ViewBox | null;
  onViewChange: (v: ViewBox | null) => void;
  /** Zoom buttons: one handle is enough because both halves share the view. */
  planRef?: Ref<Plan2DHandle>;
}

/** 2D side-by-side compare; items that changed are tinted using the backend comparison. */
export function ComparePanel({ merge, role, fromId, toId, floorId, layers, view, onViewChange, planRef }: Props) {
  const [fetchedPair, setPair] = useState<[DesignVersion, DesignVersion] | null>(null);
  const [fetchedDiff, setDiff] = useState<VersionComparison | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const merging = !!merge;
  const pair: [DesignVersion, DesignVersion] | null = merge ? [merge.base, { ...merge.base, elements: merge.elements, label: t('drafts.afterMerge') }] : fetchedPair;
  const diff = merge ? mergeComparison(merge.base.elements, merge.lines, floorId) : fetchedDiff;

  // The old pair and tint stay until the new ones arrive: picking another version must not blank the drawing or its zoom.
  useEffect(() => {
    if (merging) return;
    let alive = true;
    Promise.all([designApi.getVersion(fromId), designApi.getVersion(toId)])
      .then((p) => { if (alive) { setPair(p); setError(''); } })
      .catch((e) => alive && setError(errorText(e)));
    return () => { alive = false; };
  }, [merging, fromId, toId, attempt]);
  useEffect(() => {
    if (merging) return;
    let alive = true;
    designApi.compare(fromId, toId, floorId)
      .then((d) => alive && setDiff(d))
      .catch(() => alive && setDiff(null)); // tint is optional; the drawings still show
    return () => { alive = false; };
  }, [merging, fromId, toId, floorId]);

  const hl = useMemo(() => {
    const a: Record<string, DiffKind> = {}, b: Record<string, DiffKind> = {};
    if (!diff) return { a, b };
    // the left side is the same version, so the same item is tinted on both
    if (merging) for (const r of diff.overrides_changed) a[r.from.id] = 'changed';
    for (const e of diff.added) b[e.id] = 'added';
    for (const e of diff.removed) a[e.id] = 'removed';
    for (const m of diff.moved) { a[m.from.id] = 'moved'; b[m.to.id] = 'moved'; }
    for (const r of diff.replaced) { a[r.from.id] = 'replaced'; b[r.to.id] = 'replaced'; }
    for (const r of diff.overrides_changed) b[r.to.id] = 'changed';
    return { a, b };
  }, [diff, merging]);

  if (error) return <div className="p-6"><ErrorState message={error} onRetry={() => { setError(''); setAttempt((n) => n + 1); }} /></div>;
  if (!pair) return <Skeleton className="h-full w-full rounded-none" />;

  const floorOf = (v: DesignVersion) => v.floors.find((f) => f.id === floorId) ?? v.floors[0];
  const dot = (kind: DiffKind) => <span key={kind} aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: DIFF_COLORS[kind] }} />;
  const legend = diff && (
    <div className="absolute left-3 top-10 z-10 flex items-center gap-3 rounded-md bg-surface px-2 py-1 text-[11px] font-medium tabular-nums text-slate-700 shadow-card">
      <span className="inline-flex items-center gap-1">{dot('added')}{t('compare.kind.added')} {diff.added.length}</span>
      <span className="inline-flex items-center gap-1">{dot('removed')}{t('compare.kind.removed')} {diff.removed.length}</span>
      <span className="inline-flex items-center gap-1">{dot('moved')}{dot('replaced')}{dot('changed')}{t('compare.legendChanged')} {diff.moved.length + diff.replaced.length + diff.overrides_changed.length}</span>
    </div>
  );
  const half = (v: DesignVersion, h: Record<string, DiffKind>, handle?: Ref<Plan2DHandle>) => {
    const f = floorOf(v);
    return (
      <div className="relative min-h-0 min-w-0">
        <span className="absolute left-3 top-3 z-10 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-slate-800 shadow-card">{versionLabel(v.label, role)}</span>
        {handle && legend}
        {f && <Plan2D ref={handle} floor={f} elements={v.elements.filter((e) => e.floor_id === f.id)} layers={layers} highlight={h} view={view} onViewChange={onViewChange}
          selectedId={merge?.selectedId} onSelect={merge ? (e) => { if (e && h[e.id]) merge.onPick(e.id); } : undefined} />}
      </div>
    );
  };
  return (
    <div className="grid h-full grid-cols-2 gap-px bg-line">
      {half(pair[0], hl.a)}
      {half(pair[1], hl.b, planRef)}
    </div>
  );
}
