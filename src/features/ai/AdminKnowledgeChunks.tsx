import { useCallback, useEffect, useState } from 'react';
import { AppShell, Button, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { aiApi } from './aiApi';
import type { KnowledgeIndexStatus, KnowledgeSourceType } from './aiApi';
import { ApiError } from '@/services/authService';

const SOURCE_TYPES: { value: KnowledgeSourceType | ''; label: string }[] = [
  { value: '', label: 'All sources' },
  { value: 'COMPLETED_PROJECT', label: 'Completed projects' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'STYLE_GUIDE', label: 'Style guides' },
];

export function AdminKnowledgeChunks() {
  const [sourceType, setSourceType] = useState<KnowledgeSourceType | ''>('');
  const [items, setItems] = useState<KnowledgeIndexStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setItems(await aiApi.getKnowledgeIndex(sourceType || undefined)); }
    catch (e) {
      setError(e instanceof ApiError
        ? `${e.message}${e.code ? ` (${e.code})` : ''} · HTTP ${e.status}`
        : e instanceof Error ? e.message : 'Could not load the AI knowledge index.');
    }
    finally { setLoading(false); }
  }, [sourceType]);
  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell>
      <PageHeader back={{ to: '/admin-dashboard', label: 'Dashboard' }} title="AI knowledge index"
        description="Review how many searchable knowledge chunks are indexed for the AI assistant." />
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div><h2 className="text-sm font-semibold text-ink">Index status</h2><p className="mt-1 text-xs text-slate-500">This page reads index status; it does not start a re-index job.</p></div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="knowledge-source">Filter by source</label>
            <select id="knowledge-source" value={sourceType} onChange={(event) => setSourceType(event.target.value as KnowledgeSourceType | '')}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
              {SOURCE_TYPES.map((source) => <option key={source.value || 'all'} value={source.value}>{source.label}</option>)}
            </select>
            <Button size="sm" onClick={() => void load()} loading={loading}>Refresh</Button>
          </div>
        </div>
        {error && <div className="p-4"><ErrorState message={error} onRetry={() => void load()} /></div>}
        {loading ? <div className="space-y-3 p-4">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-12" />)}</div>
          : !error && items.length === 0 ? <p className="p-6 text-sm text-slate-500">No index records were returned for this filter.</p>
            : !error && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="bg-sand-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Source type</th><th className="px-4 py-3">Chunks</th><th className="px-4 py-3">Last indexed</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.sourceType}>
                <td className="px-4 py-3 font-medium text-ink">{SOURCE_TYPES.find((source) => source.value === item.sourceType)?.label ?? item.sourceType}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{item.chunks.toLocaleString('en-US')}</td>
                <td className="px-4 py-3 text-slate-600">{item.lastIndexedAt ? new Date(item.lastIndexedAt).toLocaleString() : 'Never'}</td>
              </tr>)}</tbody>
            </table></div>}
      </section>
    </AppShell>
  );
}

export default AdminKnowledgeChunks;
