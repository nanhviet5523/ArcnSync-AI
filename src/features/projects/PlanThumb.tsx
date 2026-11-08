import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { designApi } from '@/features/design-workspace/designApi';
import { Plan2D } from '@/features/design-workspace/Plan2D';
import type { Layers } from '@/features/design-workspace/Plan2D';
import type { DesignVersion } from '@/features/design-workspace/types';
import { queued } from './projectView';

const ALL: Layers = { interior: true, furniture: true, wallItems: true, lights: true };
/** One fetch per version for the whole session. */
const cache = new Map<string, Promise<DesignVersion>>();
const fetchVersion = (id: string) => {
  if (!cache.has(id)) cache.set(id, queued(() => designApi.getVersion(id)).catch((e) => { cache.delete(id); throw e; }));
  return cache.get(id)!;
};

/** Static 2D plan of a version's lowest floor, loaded when the card scrolls into view. Falls back to `fallback`. */
export function PlanThumb({ versionId, fallback, className = '' }: { versionId: string | null; fallback: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [version, setVersion] = useState<DesignVersion | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !versionId) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [versionId]);

  useEffect(() => {
    if (!visible || !versionId) return;
    let alive = true;
    fetchVersion(versionId).then((v) => alive && setVersion(v), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [visible, versionId]);

  const floor = version && [...version.floors].sort((a, b) => a.level - b.level)[0];
  return (
    <div ref={ref} aria-hidden className={`relative overflow-hidden ${className}`}>
      {version && floor && !failed ? (
        <Plan2D floor={floor} elements={version.elements.filter((e) => e.floor_id === floor.id)} layers={ALL} interactive={false} />
      ) : versionId && !failed ? (
        <div className="h-full w-full animate-pulse bg-stage" />
      ) : fallback}
    </div>
  );
}
