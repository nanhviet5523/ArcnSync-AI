import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ClipboardList, DraftingCompass, FileCheck2, FolderKanban, LayoutDashboard, PencilRuler, Search, UserRoundX } from 'lucide-react';
import { AppShell, Button, DataTable, EmptyState, FilterBar, Input, PageHeader, Select, StatCard, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, formatDate, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canOpenWorkspace, getProjects, isPreparing, projectApi } from './projectApi';
import type { Project, ProjectStatus } from './projectApi';
import { GreetingLine, ProjectCards } from './ProjectCards';
import { awaitingCount, draftNote, isClosed, knownVersion, needsAction, useConceptGates, useFloorCounts, useLatestVersions, versionUnknown } from './projectView';

type ListRole = 'staff' | 'admin' | 'designer' | 'homeowner';
const STATUSES: ProjectStatus[] = ['DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED', 'CANCELLED'];
const inDesign = (p: Project) => p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION';
type QuickFilter = 'all' | 'unassigned' | 'survey' | 'contract' | 'design' | 'quotation' | 'completed';
type SortMode = 'attention' | 'updated' | 'name' | 'budget';
const QUICK_FILTERS: QuickFilter[] = ['all', 'unassigned', 'survey', 'contract', 'design', 'quotation', 'completed'];
const statusForQuick = (p: Project, key: QuickFilter) => {
  if (key === 'unassigned') return !p.designer && isPreparing(p.status);
  if (key === 'survey') return (p.status === 'DRAFT' && !p.apartment) || p.status === 'REQUIREMENT_ANALYSIS';
  if (key === 'contract') return p.status === 'CONTRACT_PENDING';
  if (key === 'design') return p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION';
  if (key === 'quotation') return p.status === 'QUOTING' || p.status === 'COMPLETED';
  if (key === 'completed') return p.status === 'COMPLETED';
  return true;
};
const attentionRank = (p: Project) => !p.designer && isPreparing(p.status) ? 0 : p.status === 'CONTRACT_PENDING' ? 1 : p.status === 'DRAFT' && !p.apartment ? 2 : p.status === 'REQUIREMENT_ANALYSIS' ? 3 : p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION' ? 4 : 5;

/** Project list for Staff, Designer and Homeowner (same page, different columns and actions). */
export function ProjectList() {
  const role = (getCurrentUser()?.role ?? 'homeowner') as ListRole;
  const staff = role === 'staff';
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const search = searchParams.get('q') ?? '';
  const status = (searchParams.get('status') ?? '') as ProjectStatus | '';
  const designerFilter = searchParams.get('designer') ?? '';
  const customerFilter = searchParams.get('customer') ?? '';
  const quick = (QUICK_FILTERS.includes(searchParams.get('quick') as QuickFilter) ? searchParams.get('quick') : 'all') as QuickFilter;
  const sortMode = (['attention', 'updated', 'name', 'budget'].includes(searchParams.get('sort') ?? '') ? searchParams.get('sort') : staff ? 'attention' : 'updated') as SortMode;
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0);
  const setQuery = (patch: Record<string, string | null>, replace = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace });
  };
  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });
  const [overallTotal, setOverallTotal] = useState<number | null>(null);
  const [floors, setFloors] = useState<Record<string, number | null>>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const firstPage = await getProjects({ page: 1, limit: 100 });
      const limit = firstPage.limit || 100;
      const pageCount = Math.ceil(firstPage.total / limit);
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          getProjects({ page: index + 2, limit }),
        ),
      );
      setItems([firstPage, ...remainingPages].flatMap((pageResult) => pageResult.items));
      setOverallTotal(firstPage.total);
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const requested = useRef(new Set<string>());
  const loadFloors = useCallback((rows: Project[]) => {
    for (const p of rows) {
      if (requested.current.has(p.id)) continue;
      requested.current.add(p.id);
      projectApi.get(p.id).then(
        (d) => setFloors((x) => ({ ...x, [p.id]: d.apartment?.floors?.length ?? 0 })),
        () => setFloors((x) => ({ ...x, [p.id]: null })),
      );
    }
  }, []);

  const all = useMemo(() => items ?? [], [items]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => (!status || p.status === status)
      && (quick === 'all' || statusForQuick(p, quick))
      && (!designerFilter || p.designer?.id === designerFilter)
      && (!customerFilter || p.customer.id === customerFilter)
      && (!q || [p.title, p.code, p.customer.fullName, p.apartment?.buildingName, p.designer?.fullName].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, status, quick, designerFilter, customerFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortMode === 'name') return a.title.localeCompare(b.title);
    if (sortMode === 'budget') return Number(b.budgetMax) - Number(a.budgetMax);
    if (sortMode === 'updated') return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
    return attentionRank(a) - attentionRank(b) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
  }), [filtered, sortMode]);

  // Designer and Homeowner see cards; Staff and Admin keep the table below.
  const cards = role === 'designer' || role === 'homeowner';
  const cardItems = cards ? items : null;
  const { latest, ready, retry, retryAll } = useLatestVersions(cardItems, role === 'designer' ? 'designer' : 'homeowner');
  const cardFloors = useFloorCounts(cardItems);
  const gate = useConceptGates(cardItems, latest);

  const open = (p: Project) => {
    if (role === 'designer') {
      if (p.myProjectRole === 'LEAD' && gate(p.id)) navigate(`/designer/projects/${p.id}#concept`);
      else if (canOpenWorkspace(p.status)) navigate(`/projects/${p.id}/workspace`);
      return;
    }
    const path = role === 'homeowner' ? `/homeowner/projects/${p.id}` : `/staff/projects/${p.id}`;
    navigate(path, { state: { fromProjects: `${location.pathname}${location.search}` } });
  };

  const count = (f: (p: Project) => boolean) => all.filter(f).length;
  const stats = {
    staff: [
      { label: t('projects.stat.total'), value: overallTotal ?? all.length },
      { label: t('projects.stat.inDesign'), value: count(inDesign), hint: t('projects.statHint.inDesign') },
      { label: t('projects.stat.quoteHandover'), value: count((p) => p.status === 'QUOTING' || p.status === 'COMPLETED') },
      { label: t('projects.stat.noDesigner'), value: count((p) => !p.designer && isPreparing(p.status)), hint: t('projects.statHint.noDesigner') },
    ],
    designer: [
      { label: t('projects.stat.assigned'), value: all.length },
      { label: t('projects.stat.layout'), value: count((p) => p.status === 'IN_DESIGN') },
      { label: t('projects.stat.products'), value: count((p) => p.status === 'PRODUCT_SELECTION') },
      { label: t('projects.stat.completed'), value: count((p) => p.status === 'COMPLETED') },
    ],
    homeowner: [
      { label: t('projects.stat.mine'), value: all.length },
      { label: t('projects.stat.inDesign'), value: count(inDesign) },
      { label: t('projects.stat.completed'), value: count((p) => p.status === 'COMPLETED') },
    ],
  }[role === 'admin' ? 'staff' : role];

  const columns: Column<Project>[] = [
    { key: 'project', header: t('projects.col.project'), cell: (p) => <div className="min-w-0"><p className="truncate font-medium text-ink">{p.title}</p><p className="text-xs text-slate-500">{p.code}</p></div> },
    { key: 'home', header: t('projects.col.home'), cell: (p) => <div className="min-w-0"><p className="truncate text-ink">{p.apartment ? `${p.apartment.buildingName}${p.apartment.unitNo ? `, ${p.apartment.unitNo}` : ''}` : t('projectDetail.pendingSurvey')}</p><p className="text-xs text-slate-500">{floors[p.id] === undefined ? <span className="inline-block h-3 w-14 animate-pulse rounded bg-slate-100 align-middle" /> : floors[p.id] === null ? t('common.none') : t('projects.floors', { n: floors[p.id]! })}</p></div> },
    ...(role !== 'homeowner' ? [{ key: 'homeowner', header: t('projects.col.homeowner'), cell: (p: Project) => <span className="text-slate-700">{p.customer.fullName}</span> }] : []),
    ...(role !== 'designer' ? [{ key: 'designer', header: t('projects.col.designer'), cell: (p: Project) => p.designer ? <span className="text-slate-700">{p.designer.fullName}</span> : <span className="text-subtext">{t('projects.notAssigned')}</span> }] : []),
    { key: 'status', header: t('projects.col.status'), cell: (p) => <StatusChip kind="project" value={p.status} /> },
    { key: 'updated', header: t('projects.col.updated'), className: 'whitespace-nowrap tabular-nums', cell: (p) => <span className="text-slate-600">{formatDate(p.updatedAt ?? p.createdAt)}</span> },
    { key: 'action', header: '', className: 'w-px text-right', cell: (p) => role === 'designer' && !canOpenWorkspace(p.status) ? null : <Button size="sm" variant={role === 'designer' ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); open(p); }}>{role === 'designer' ? t('projects.openWorkspace') : t('projects.view')}</Button> },
  ];

  const filteredOut = !!items?.length && !filtered.length;

  if (cards) {
    const loading = !items && !error;
    const needs = (projects: Project[]) => projects.filter((p) => needsAction(role, p, latest(p.id), gate(p.id))).length;
    const icon = 'h-5 w-5';
    const cardStats = role === 'designer' ? [
      <StatCard key="a" label={t('projects.stat.assigned')} value={all.length} loading={loading} icon={<FolderKanban className={icon} />} />,
      <StatCard key="l" label={t('projects.stat.layout')} value={count((p) => p.status === 'IN_DESIGN')} loading={loading} icon={<PencilRuler className={icon} />} />,
      <StatCard key="p" label={t('projects.stat.products')} value={count((p) => p.status === 'PRODUCT_SELECTION')} loading={loading} icon={<FolderKanban className={icon} />} />,
    ] : [];
    const filters = <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto"><label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none"><span className="sr-only">{t('cards.search')}</span><Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input value={search} onChange={(e) => setQuery({ q: e.target.value || null, page: null })} placeholder={t('cards.search')} className="pl-8" /></label><Select aria-label={t('projects.col.status')} value={status} onChange={(e) => setQuery({ status: e.target.value || null, page: null })} className="w-full sm:w-48"><option value="">{t('projects.allStatuses')}</option>{STATUSES.map((s) => <option key={s} value={s}>{t(`status.project.${s}`)}</option>)}</Select></div>;
    return <AppShell><PageHeader title={t(`projects.title.${role}`)} secondary={!error && filters} description={error ? t(`projects.description.${role}`) : <GreetingLine name={getCurrentUser()?.name} count={needs(all)} replies={all.reduce((n, p) => n + awaitingCount(p, latest(p.id)), 0)} draftNote={draftNote(all.flatMap((p) => knownVersion(latest(p.id))?.draftRooms ?? []))} unknown={all.filter((p) => !isClosed(p.status) && versionUnknown(latest(p.id))).length} onRetryAll={() => retryAll(all.filter((p) => !isClosed(p.status)).map((p) => p.id))} loading={loading || !ready} />} />{!error && !loading && all.length > 3 && cardStats.length > 0 && <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{cardStats}</div>}<ProjectCards role={role} projects={items && filtered} latest={latest} gate={gate} floors={cardFloors} error={error} onRetry={load} filteredOut={filteredOut} onClearFilters={clearFilters} onWorkspace={(p) => navigate(`/projects/${p.id}/workspace`)} onDetails={(p) => navigate(`/${role}/projects/${p.id}`)} onRetryVersion={retry} filtering={!!search.trim() || !!status} large={role === 'homeowner' && items?.length === 1} /></AppShell>;
  }

  const quickCounts = Object.fromEntries(QUICK_FILTERS.map((key) => [key, key === 'all' ? all.length : all.filter((p) => statusForQuick(p, key)).length])) as Record<QuickFilter, number>;
  const actionItems = [...all].filter((p) => attentionRank(p) < 4).sort((a, b) => attentionRank(a) - attentionRank(b) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 8);
  const activeItems = [...all].filter((p) => p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION').sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 8);
  const countCards = [
    { key: 'all' as QuickFilter, label: t('projects.stat.total'), value: items ? (overallTotal ?? all.length) : '—', icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.8} /> },
    { key: 'unassigned' as QuickFilter, label: t('projects.stat.noDesigner'), value: items ? quickCounts.unassigned : '—', icon: <UserRoundX className="h-5 w-5" strokeWidth={1.8} /> },
    { key: 'quotation' as QuickFilter, label: t('projects.stat.quoteHandover'), value: items ? count((p) => p.status === 'QUOTING' || p.status === 'COMPLETED') : '—', icon: <FileCheck2 className="h-5 w-5" strokeWidth={1.8} /> },
    { key: 'design' as QuickFilter, label: t('projects.stat.inDesign'), value: items ? quickCounts.design : '—', icon: <DraftingCompass className="h-5 w-5" strokeWidth={1.8} /> },
  ];
  const designerOptions = [...new Map(all.filter((p) => p.designer).map((p) => [p.designer!.id, p.designer!])).values()];
  const customerOptions = [...new Map(all.map((p) => [p.customer.id, p.customer])).values()];
  return (
    <AppShell wide>
      <PageHeader title={t(`projects.title.${role}`)} description={t('staffUx.today.description')}
        primary={(role === 'staff' || role === 'admin') && <Button variant="primary" onClick={() => navigate('/staff/projects/new')}>{t('projects.newProject')}</Button>} />

      {staff && <section aria-labelledby="staff-today-title" className="mb-6 space-y-4">
        <div className="flex items-center gap-2"><ClipboardList aria-hidden className="h-5 w-5 text-brand-text" /><h2 id="staff-today-title" className="text-lg font-bold text-ink">{t('staffUx.today.title')}</h2></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{countCards.map((card) => <button key={card.key} type="button" onClick={() => setQuery({ quick: card.key === 'all' ? null : card.key, status: null, designer: null, customer: null, q: null, page: null })} aria-pressed={quick === card.key} className="rounded-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><StatCard label={card.label} value={card.value} loading={!items && !error} icon={card.icon} /></button>)}</div>
        <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-ink">{t('staffUx.today.queue')}</h3>
          {error ? <p className="text-sm text-slate-600">{t('staffUx.today.unavailable')}</p> : !items ? <div aria-busy="true" className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div> : actionItems.length ? <ul className="divide-y divide-line">{actionItems.map((p) => {
            const reason = !p.designer && isPreparing(p.status) ? t('staffUx.attention.noDesigner') : p.status === 'CONTRACT_PENDING' ? t('staffUx.attention.contract') : p.status === 'DRAFT' ? t('staffUx.attention.survey') : p.status === 'REQUIREMENT_ANALYSIS' ? t('staffUx.attention.analysis') : t('staffUx.attention.design');
            return <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{p.title} <span className="font-normal text-slate-500">· {p.code}</span></p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600"><AlertCircle aria-hidden className="h-3.5 w-3.5" />{reason}</p></div><Button size="sm" variant={!p.designer && isPreparing(p.status) ? 'primary' : 'secondary'} onClick={() => open(p)}>{!p.designer && isPreparing(p.status) ? t('staffUx.today.assign') : t('projects.view')}</Button></li>;
          })}</ul> : <p className="text-sm text-slate-600">{t('staffUx.today.done')}</p>}
          {items && activeItems.length > 0 && <section className="mt-4 border-t border-line pt-4" aria-labelledby="staff-in-progress-title">
            <h4 id="staff-in-progress-title" className="mb-2 text-sm font-semibold text-ink">{t('staffUx.today.inProgress')} <span className="font-normal text-slate-500">· {activeItems.length}</span></h4>
            <ul className="divide-y divide-line">{activeItems.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{p.title} <span className="font-normal text-slate-500">· {p.code}</span></p><p className="mt-1 text-xs text-slate-600">{t(`status.project.${p.status}`)}</p></div><Button size="sm" variant="secondary" onClick={() => open(p)}>{t('projects.view')}</Button></li>)}</ul>
          </section>}
        </div>
      </section>}

      {!staff && <div className={`mb-5 grid gap-3 ${stats.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>{stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} hint={'hint' in s ? s.hint : undefined} loading={!items && !error} />)}</div>}

      {staff && items && <div className="mb-3 flex flex-wrap gap-2" aria-label={t('staffUx.quick.label')}>{QUICK_FILTERS.map((key) => <button key={key} type="button" aria-pressed={quick === key} onClick={() => setQuery({ quick: key === 'all' ? null : key, page: null })} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${quick === key ? 'border-brand bg-brand-soft text-brand-text' : 'border-line bg-surface text-slate-700 hover:bg-sand-50'}`}><span>{t(`staffUx.quick.${key}`)}</span><span className="rounded-full bg-sand-100 px-1.5 text-xs tabular-nums">{quickCounts[key]}</span></button>)}</div>}

      <div className="mb-3 space-y-2">
        <FilterBar search={search} onSearch={(v) => setQuery({ q: v || null, page: null })} placeholder={t('projects.searchPlaceholder')}>
          <Select aria-label={t('projects.col.status')} value={status} onChange={(e) => setQuery({ status: e.target.value || null, page: null })} className="w-full sm:w-48"><option value="">{t('projects.allStatuses')}</option>{STATUSES.map((s) => <option key={s} value={s}>{t(`status.project.${s}`)}</option>)}</Select>
          {staff && <Select aria-label={t('projects.col.designer')} value={designerFilter} onChange={(e) => setQuery({ designer: e.target.value || null, page: null })} className="w-full sm:w-48"><option value="">{t('staffUx.filters.allDesigners')}</option>{designerOptions.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}</Select>}
          {staff && <Select aria-label={t('projects.col.homeowner')} value={customerFilter} onChange={(e) => setQuery({ customer: e.target.value || null, page: null })} className="w-full sm:w-48"><option value="">{t('staffUx.filters.allCustomers')}</option>{customerOptions.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</Select>}
          {staff && <Select aria-label={t('staffUx.sort.label')} value={sortMode} onChange={(e) => setQuery({ sort: e.target.value, page: null })} className="w-full sm:w-48"><option value="attention">{t('staffUx.sort.attention')}</option><option value="updated">{t('staffUx.sort.updated')}</option><option value="name">{t('staffUx.sort.name')}</option><option value="budget">{t('staffUx.sort.budget')}</option></Select>}
        </FilterBar>
        {items && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{t('staffUx.filters.results', { shown: sorted.length, total: overallTotal ?? all.length })}{all.length < (overallTotal ?? all.length) ? ` · ${t('staffUx.filters.loaded', { count: all.length })}` : ''}</span>{(search || status || quick !== 'all' || designerFilter || customerFilter) && <Button size="sm" variant="ghost" onClick={clearFilters}>{t('projects.clearFilters')}</Button>}</div>}
      </div>

      <DataTable columns={columns} rows={items ? sorted : null} rowKey={(p) => p.id} error={error} onRetry={load} onRowClick={open} onPageRows={loadFloors} pageSize={10} pageState={page} onPageChange={(next) => setQuery({ page: next ? String(next) : null })} empty={filteredOut ? <EmptyState title={t('projects.empty.filtered')} action={<Button size="sm" onClick={clearFilters}>{t('projects.clearFilters')}</Button>} /> : <EmptyState title={t(`projects.empty.${role}`)} action={(role === 'staff' || role === 'admin') && <Button variant="primary" size="sm" onClick={() => navigate('/staff/projects/new')}>{t('projects.newProject')}</Button>} />} />
    </AppShell>
  );
}

export default ProjectList;
