import { useCallback, useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { AppShell, Button, DataTable, DetailList, ErrorState, FilterBar, Modal, PageHeader, Select, StatusChip, Tabs, Textarea } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, formatDateTime, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { INQUIRY_STATUSES, INQUIRY_TOPICS, inquiryApi } from './inquiryApi';
import type { Inquiry, InquiryStatus, InquiryTopic } from './inquiryApi';

type Filter = InquiryStatus | 'ALL';

/**
 * Shared inbox of the public contact form for staff and admin (/staff/inquiries): filter by status / topic / text,
 * claim an inquiry, keep an internal note and move it NEW → IN_PROGRESS → RESOLVED (or SPAM).
 */
export function InquiriesPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [topic, setTopic] = useState<InquiryTopic | ''>('');
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Inquiry[] | null>(null);
  const [matched, setMatched] = useState(0);
  const [counts, setCounts] = useState<Record<InquiryStatus, number> | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Inquiry | null>(null);

  // search waits for typing to pause
  useEffect(() => { const id = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(id); }, [search]);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await inquiryApi.list({ status: filter === 'ALL' ? undefined : filter, topic: topic || undefined, q: query || undefined, mine });
      setRows(r.items); setCounts(r.counts); setMatched(r.total);
    } catch (e) { setError(errorText(e)); }
  }, [filter, topic, query, mine]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const total = counts ? INQUIRY_STATUSES.reduce((n, s) => n + counts[s], 0) : 0;
  const filtered = filter !== 'ALL' || !!topic || !!query || mine;
  const columns: Column<Inquiry>[] = [
    { key: 'from', header: t('inquiries.col.from'), cell: (i) => <><p className="font-medium text-slate-900">{i.fullName}</p><p className="text-xs text-slate-500">{i.email}</p></>, sort: (i) => i.fullName },
    { key: 'topic', header: t('inquiries.col.topic'), cell: (i) => t(`inquiries.topic.${i.topic}`), sort: (i) => i.topic },
    { key: 'message', header: t('inquiries.col.message'), cell: (i) => <p className="line-clamp-2 max-w-md text-slate-700">{i.message}</p>, hideOnMobile: true },
    { key: 'status', header: t('inquiries.col.status'), cell: (i) => <StatusChip kind="inquiry" value={i.status} size="sm" /> },
    { key: 'assignee', header: t('inquiries.col.assignee'), cell: (i) => i.assignee?.fullName ?? <span className="text-slate-500">{t('inquiries.unassigned')}</span>, hideOnMobile: true },
    { key: 'received', header: t('inquiries.col.received'), cell: (i) => formatDateTime(i.createdAt), sort: (i) => i.createdAt },
  ];

  return (
    <AppShell wide>
      <PageHeader title={t('inquiries.title')} description={t('inquiries.description')} />
      <div className="mb-4 flex flex-col gap-3">
        <Tabs<Filter> label={t('inquiries.col.status')} value={filter} onChange={setFilter}
          items={[
            { id: 'ALL', label: `${t('inquiries.all')}${counts ? ` (${total})` : ''}` },
            ...INQUIRY_STATUSES.map((s) => ({ id: s, label: `${t(`status.inquiry.${s}`)}${counts ? ` (${counts[s]})` : ''}` })),
          ]} />
        <FilterBar search={search} onSearch={setSearch} placeholder={t('inquiries.searchPlaceholder')}>
          <Select aria-label={t('inquiries.col.topic')} value={topic} onChange={(e) => setTopic(e.target.value as InquiryTopic | '')} className="w-48">
            <option value="">{t('inquiries.allTopics')}</option>
            {INQUIRY_TOPICS.map((x) => <option key={x} value={x}>{t(`inquiries.topic.${x}`)}</option>)}
          </Select>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            {t('inquiries.mine')}
          </label>
        </FilterBar>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(i) => i.id} error={error} onRetry={load}
        empty={t(filtered ? 'inquiries.emptyFiltered' : 'inquiries.empty')} onRowClick={setOpen} initialSort={{ key: 'received', dir: 'desc' }} pageSize={15} />
      {rows && matched > rows.length && <p className="mt-2 text-xs text-slate-500">{t('common.showingOf', { shown: rows.length, total: matched })}</p>}
      {open && <InquiryDialog key={open.id} inquiry={open} onClose={() => setOpen(null)} onChanged={(i) => { setOpen(i); void load(); }} />}
    </AppShell>
  );
}

function InquiryDialog({ inquiry: i, onClose, onChanged }: { inquiry: Inquiry; onClose: () => void; onChanged: (i: Inquiry) => void }) {
  const me = getCurrentUser()?.id;
  const [note, setNote] = useState(i.staffNote ?? '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const run = async (key: string, body: Parameters<typeof inquiryApi.update>[1]) => {
    setBusy(key); setError('');
    try {
      const updated = await inquiryApi.update(i.id, body);
      setNote(updated.staffNote ?? '');
      onChanged(updated);
    } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  };
  const mineNow = i.assignee?.id === me;
  const noteChanged = note.trim() !== (i.staffNote ?? '').trim();
  const locked = busy !== '';

  return (
    <Modal title={t('inquiries.detailTitle')} size="md" onClose={onClose} footer={<>
      {i.status === 'SPAM' ? <Button disabled={locked} loading={busy === 'restore'} onClick={() => run('restore', { status: 'NEW' })}>{t('inquiries.restore')}</Button>
        : i.status !== 'RESOLVED' && <Button variant="ghost" disabled={locked} loading={busy === 'spam'} onClick={() => run('spam', { status: 'SPAM' })}>{t('inquiries.markSpam')}</Button>}
      {i.status !== 'SPAM' && !mineNow && (
        <Button disabled={locked} loading={busy === 'claim'} onClick={() => run('claim', { assignToMe: true })}>{t('inquiries.claim')}</Button>
      )}
      {i.status === 'RESOLVED' ? <Button variant="primary" disabled={locked} loading={busy === 'reopen'} onClick={() => run('reopen', { status: 'IN_PROGRESS' })}>{t('inquiries.reopen')}</Button>
        : i.status !== 'SPAM' && <Button variant="primary" disabled={locked} loading={busy === 'resolve'} onClick={() => run('resolve', { status: 'RESOLVED' })}>{t('inquiries.markResolved')}</Button>}
    </>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[15px] font-semibold text-slate-900">{i.fullName}</p>
            <p className="text-xs text-slate-500">{t('inquiries.received', { date: formatDateTime(i.createdAt) })}{i.handledAt && ` · ${t('inquiries.handled', { date: formatDateTime(i.handledAt) })}`}</p>
          </div>
          <StatusChip kind="inquiry" value={i.status} />
        </div>
        <DetailList items={[
          { label: t('inquiries.contact'), value: <>{i.email}{i.phone && <span className="block text-slate-600">{i.phone}</span>}</> },
          { label: t('inquiries.col.topic'), value: t(`inquiries.topic.${i.topic}`) },
          ...(i.propertyType ? [{ label: t('inquiries.propertyType'), value: t(`projectDetail.propertyType.${i.propertyType}`) }] : []),
          { label: t('inquiries.col.assignee'), value: i.assignee?.fullName ?? t('inquiries.unassigned') },
        ]} />
        <p className="whitespace-pre-line rounded-lg border border-line bg-slate-50 px-3 py-2.5 text-sm text-slate-800">{i.message}</p>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${i.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] font-medium text-slate-800 hover:bg-slate-50"><Mail aria-hidden className="h-4 w-4" />{t('inquiries.replyEmail')}</a>
          {i.phone && <a href={`tel:${i.phone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] font-medium text-slate-800 hover:bg-slate-50"><Phone aria-hidden className="h-4 w-4" />{t('inquiries.call')}</a>}
        </div>
        <div>
          <label htmlFor="inquiry-note" className="mb-1.5 block text-[13px] font-medium text-slate-700">{t('inquiries.staffNote')}</label>
          <Textarea id="inquiry-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t('inquiries.staffNoteHint')}</p>
            <Button size="sm" disabled={locked || !noteChanged} loading={busy === 'note'} onClick={() => run('note', { staffNote: note.trim() || null })}>{t('inquiries.saveNote')}</Button>
          </div>
        </div>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

export default InquiriesPage;
