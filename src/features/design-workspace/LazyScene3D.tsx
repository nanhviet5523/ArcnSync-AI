import { Component, lazy, Suspense, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ErrorState, Skeleton } from '@/components/ui';
import { t } from '@/i18n';
import type { Scene3D as Scene3DComponent } from './Scene3D';

const load = () => lazy(() => import('./Scene3D').then((m) => ({ default: m.Scene3D })));
/** three.js is about 700 kB: only someone who opens 3D downloads it. lazy() remembers a failure, so Retry needs a new one. */
let Scene3D = load();

class LoadBoundary extends Component<{ onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md"><ErrorState message={t('scene.loadFailed')} onRetry={this.props.onRetry} /></div>
      </div>
    );
  }
}

/** The 3D view, downloaded the first time it is opened. A failed download keeps the rest of the workspace on screen. */
export function LazyScene3D(props: ComponentProps<typeof Scene3DComponent>) {
  const [attempt, setAttempt] = useState(0);
  return (
    <LoadBoundary key={attempt} onRetry={() => { Scene3D = load(); setAttempt((n) => n + 1); }}>
      <Suspense fallback={<Skeleton className="h-full w-full rounded-none bg-stage" />}>
        <Scene3D {...props} />
      </Suspense>
    </LoadBoundary>
  );
}
