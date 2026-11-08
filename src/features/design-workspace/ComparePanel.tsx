import { useEffect, useMemo, useState } from 'react';
import { ErrorState, Skeleton } from '@/components/ui';
import { errorText } from '@/i18n';
import { designApi } from './designApi';
import type { DiffKind } from './logic';
import { versionLabel } from './logic';
import { Plan2D } from './Plan2D';
import type { Layers, ViewBox } from './Plan2D';
import type { DesignVersion, VersionComparison } from './types';

interface Props {
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
}

/** 2D side-by-side compare; items that changed are tinted using the backend comparison. */
export function ComparePanel({ role, fromId, toId, floorId, layers, view, onViewChange }: Props) {
  const [pair, setPair] = useState<[DesignVersion, DesignVersion] | null>(null);
  const [diff, setDiff] = useState<VersionComparison | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([designApi.getVersion(fromId), designApi.getVersion(toId)])
      .then((p) => alive && setPair(p))
      .catch((e) => alive && setError(errorText(e)));
    return () => { alive = false; setPair(null); };
  }, [fromId, toId]);
  useEffect(() => {
    let alive = true;
    designApi.compare(fromId, toId, floorId)
      .then((d) => alive && setDiff(d))
      .catch(() => undefined); // tint is optional; the drawings still show
    return () => { alive = false; setDiff(null); };
  }, [fromId, toId, floorId]);

  const hl = useMemo(() => {
    const a: Record<string, DiffKind> = {}, b: Record<string, DiffKind> = {};
    if (!diff) return { a, b };
    for (const e of diff.added) b[e.id] = 'added';
    for (const e of diff.removed) a[e.id] = 'removed';
    for (const m of diff.moved) { a[m.from.id] = 'moved'; b[m.to.id] = 'moved'; }
    for (const r of diff.replaced) { a[r.from.id] = 'replaced'; b[r.to.id] = 'replaced'; }
    for (const r of diff.overrides_changed) b[r.to.id] = 'changed';
    return { a, b };
  }, [diff]);

  if (error) return <div className="p-6"><ErrorState message={error} /></div>;
  if (!pair) return <Skeleton className="h-full w-full rounded-none" />;

  const floorOf = (v: DesignVersion) => v.floors.find((f) => f.id === floorId) ?? v.floors[0];
  const half = (v: DesignVersion, h: Record<string, DiffKind>) => {
    const f = floorOf(v);
    return (
      <div className="relative min-h-0 min-w-0">
        <span className="absolute left-3 top-3 z-10 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-slate-800 shadow-card">{versionLabel(v.label, role)}</span>
        {f && <Plan2D floor={f} elements={v.elements.filter((e) => e.floor_id === f.id)} layers={layers} highlight={h} view={view} onViewChange={onViewChange} />}
      </div>
    );
  };
  return (
    <div className="grid h-full grid-cols-2 gap-px bg-line">
      {half(pair[0], hl.a)}
      {half(pair[1], hl.b)}
    </div>
  );
}
