import { Component, lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { ErrorState, Skeleton } from '@/components/ui';
import { t } from '@/i18n';

const load = () => lazy(() => import('./GlbPreviewCanvas').then((m) => ({ default: m.GlbPreviewCanvas })));
/** three.js is ~700 kB: only download it when the user opens a 3D model preview. */
let GlbPreviewCanvas = load();

class LoadBoundary extends Component<{ onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-[58vh] min-h-[320px] items-center justify-center p-6">
        <div className="w-full max-w-md"><ErrorState message={t('scene.loadFailed')} onRetry={this.props.onRetry} /></div>
      </div>
    );
  }
}

export function LazyGlbPreview({ assetId }: { assetId: string }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <LoadBoundary key={attempt} onRetry={() => { GlbPreviewCanvas = load(); setAttempt((n) => n + 1); }}>
      <Suspense fallback={<Skeleton className="h-[58vh] min-h-[320px] w-full rounded-xl bg-stage" />}>
        <GlbPreviewCanvas assetId={assetId} />
      </Suspense>
    </LoadBoundary>
  );
}
