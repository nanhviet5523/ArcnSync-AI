import { useCallback, useEffect, useState } from 'react';
import { AppShell, Button, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { formatDateTime, formatNumber, t } from '@/i18n';
import { aiApi } from './aiApi';
import type { KnowledgeIndexStatus, KnowledgeSourceType } from './aiApi';
import { classifyAiError } from './aiLogic';

const SOURCE_TYPES: (KnowledgeSourceType | '')[] = ['', 'COMPLETED_PROJECT', 'PRODUCT', 'STYLE_GUIDE'];
const sourceLabel = (source: string) => {
  const key = `ai.knowledge.source.${source || 'all'}`;
  const label = t(key);
  return label === key ? source : label;
};

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
      const c = classifyAiError(e);
      if (!c.known) console.warn('[ai] unmapped error', c.code || e);
      setError(t(c.messageKey));
    }
    finally { setLoading(false); }
  }, [sourceType]);
  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell>
      <PageHeader back={{ to: '/admin-dashboard', label: t('ai.knowledge.back') }} title={t('ai.knowledge.title')}
        description={t('ai.knowledge.description')} />
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div><h2 className="text-sm font-semibold text-ink">{t('ai.knowledge.statusTitle')}</h2><p className="mt-1 text-xs text-slate-500">{t('ai.knowledge.statusNote')}</p></div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="knowledge-source">{t('ai.knowledge.filterLabel')}</label>
            <select id="knowledge-source" value={sourceType} onChange={(event) => setSourceType(event.target.value as KnowledgeSourceType | '')}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
              {SOURCE_TYPES.map((source) => <option key={source || 'all'} value={source}>{sourceLabel(source)}</option>)}
            </select>
            <Button size="sm" onClick={() => void load()} loading={loading}>{t('ai.knowledge.refresh')}</Button>
          </div>
        </div>
        {error && <div className="p-4"><ErrorState message={error} onRetry={() => void load()} /></div>}
        {loading ? <div className="space-y-3 p-4">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-12" />)}</div>
          : !error && items.length === 0 ? <p className="p-6 text-sm text-slate-500">{t('ai.knowledge.empty')}</p>
            : !error && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="bg-sand-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">{t('ai.knowledge.colSource')}</th><th className="px-4 py-3">{t('ai.knowledge.colChunks')}</th><th className="px-4 py-3">{t('ai.knowledge.colLastIndexed')}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.sourceType}>
                <td className="px-4 py-3 font-medium text-ink">{sourceLabel(item.sourceType)}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{formatNumber(item.chunks)}</td>
                <td className="px-4 py-3 text-slate-600">{item.lastIndexedAt ? formatDateTime(item.lastIndexedAt) : t('ai.knowledge.never')}</td>
              </tr>)}</tbody>
            </table></div>}
      </section>
    </AppShell>
  );
}

export default AdminKnowledgeChunks;
