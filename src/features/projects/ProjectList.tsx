import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, ClipboardList, DraftingCompass, FileCheck2, FolderKanban, LayoutDashboard, Package, PencilRuler, Plus, Receipt, Search, UserRoundX, UserX, X } from 'lucide-react';
import { AppShell, Button, DataTable, EmptyState, FilterBar, Input, PageHeader, Select, StatCard, StatusChip, avatarTone, initials } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, formatDate, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canOpenWorkspace, getProjects, isPreparing, projectApi } from './projectApi';
import type { Project, ProjectStatus } from './projectApi';
import { GreetingLine, ProjectCards } from './ProjectCards';
import { awaitingCount, draftNote, isClosed, knownVersion, needsAction, nextFor, useConceptGates, useFloorCounts, useLatestVersions, versionUnknown } from './projectView';
import { MiniSteps } from './ProjectStepper';

type ListRole = 'staff' | 'admin' | 'designer' | 'homeowner';
const STATUSES: ProjectStatus[] = ['DRAFT', 'CONTRACT_PENDING', 'IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED', 'CANCELLED'];
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

/** Staff stat tiles double as quick filters on the table (combined with search and the status select). */
const QUICK = {
  inDesign,
  quoteHandover: (p: Project) => p.status === 'QUOTING' || p.status === 'COMPLETED',
  noDesigner: (p: Project) => !p.designer && isPreparing(p.status),
} as const;

/** Homeowner initials in a colour picked from the person's id, next to the name. */
function PersonName({ id, name }: { id: string; name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${avatarTone(id)}`}>{initials(name)}</span>
      <span className="truncate text-slate-700">{name}</span>
    </span>
  );
}

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
  const quickValue = searchParams.get('quick');
  const quick = (QUICK_FILTERS.includes(quickValue as QuickFilter) ? quickValue : 'all') as QuickFilter;
  const sortValue = searchParams.get('sort') ?? '';
  const sortMode = (['attention', 'updated', 'name', 'budget'].includes(sortValue) ? sortValue : staff ? 'attention' : 'updated') as SortMode;
  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0);

  const setQuery = (patch: Record<string, string | null>, replace = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    for (const key of ['q', 'status', 'quick', 'designer', 'customer', 'sort', 'page']) next.delete(key);
    setSearchParams(next, { replace: true });
  };

  /** Total from GET /projects without filters; search and the status filter run on the client, so it never shrinks with them. */
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
  const tileIcon = 'h-5 w-5';
  const noDesignerCount = count(QUICK.noDesigner);

  // Staff and Admin only (Designer and Homeowner get the cards view below). Clicking a tile filters the table to
  // its projects, clicking it again (or Total) shows them all.
  const stats: { label: string; value: number; hint?: string; icon: ReactNode; tone: 'brand' | 'blue' | 'orange' | 'amber'; quick: QuickFilter | null; attention?: boolean }[] = [
    { label: t('projects.stat.total'), value: overallTotal ?? all.length, icon: <FolderKanban className={tileIcon} />, tone: 'brand', quick: null },
    { label: t('projects.stat.inDesign'), value: count(QUICK.inDesign), hint: t('projects.statHint.inDesign'), icon: <PencilRuler className={tileIcon} />, tone: 'blue', quick: 'design' },
    { label: t('projects.stat.quoteHandover'), value: count(QUICK.quoteHandover), icon: <Receipt className={tileIcon} />, tone: 'orange', quick: 'quotation' },
    { label: t('projects.stat.noDesigner'), value: noDesignerCount, hint: t('projects.statHint.noDesigner'), icon: <UserX className={tileIcon} />, tone: 'amber', quick: 'unassigned', attention: noDesignerCount > 0 },
  ];
  const quickLabel = quick === 'all' ? null : t(`staffUx.quick.${quick}`);

  const columns: Column<Project>[] = [
    {
      key: 'project', header: t('projects.col.project'), sort: (p) => p.title.toLowerCase(),
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink transition-colors group-hover:text-brand">{p.title}</p>
          <p className="mt-0.5 font-mono text-[11px] tracking-tight text-slate-500">{p.code}</p>
        </div>
      ),
    },
    {
      key: 'home', header: t('projects.col.home'), sort: (p) => (p.apartment?.buildingName ?? '').toLowerCase(),
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate text-ink">{p.apartment ? `${p.apartment.buildingName}${p.apartment.unitNo ? `, ${p.apartment.unitNo}` : ''}` : t('projectDetail.pendingSurvey')}</p>
          <p className="text-xs text-slate-500">
            {floors[p.id] === undefined
              ? <span className="inline-block h-3 w-14 animate-pulse rounded bg-slate-100 align-middle" />
              : floors[p.id] === null ? t('common.none') : t('projects.floors', { n: floors[p.id]! })}
          </p>
        </div>
      ),
    },
    ...(role !== 'homeowner' ? [{
      key: 'homeowner', header: t('projects.col.homeowner'), sort: (p: Project) => p.customer.fullName.toLowerCase(),
      cell: (p: Project) => <PersonName id={p.customer.id} name={p.customer.fullName} />,
    }] : []),
    ...(role !== 'designer' ? [{
      key: 'designer', header: t('projects.col.designer'), sort: (p: Project) => p.designer?.fullName.toLowerCase() ?? '~',
      cell: (p: Project) => (p.designer ? <PersonName id={p.designer.id} name={p.designer.fullName} /> : (
        <span className="flex items-center gap-2 text-subtext">
          <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-dashed border-slate-300" />
          {t('projects.notAssigned')}
        </span>
      )),
    }] : []),
    {
      key: 'status', header: t('projects.col.status'), sort: (p) => STATUSES.indexOf(p.status),
      cell: (p) => <div><StatusChip kind="project" value={p.status} /><MiniSteps status={p.status} /></div>,
    },
    {
      key: 'updated', header: t('projects.col.updated'), sort: (p) => p.updatedAt ?? p.createdAt, className: 'whitespace-nowrap tabular-nums',
      cell: (p) => <span className="text-slate-600">{formatDate(p.updatedAt ?? p.createdAt)}</span>,
    },
    {
      key: 'action', header: '', className: 'w-px text-right',
      cell: (p) => {
        if (role === 'designer' && !canOpenWorkspace(p.status)) return null;
        return (
          <Button size="sm" variant={role === 'designer' ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); open(p); }}
            className="group-hover:border-brand/40 group-hover:text-brand">
            {role === 'designer' ? t('projects.openWorkspace') : t('projects.view')}
            <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Button>
        );
      },
    },
  ];

  const filteredOut = !!items?.length && !filtered.length;

  if (cards) {
    const loading = !items && !error;
    const needs = (projects: Project[]) => projects.filter((p) => needsAction(role, p, latest(p.id), gate(p.id))).length;
    const designerActionItems = all.filter((p) => needsAction('designer', p, latest(p.id), gate(p.id)))
      .sort((a, b) => Number(awaitingCount(b, latest(b.id)) > 0) - Number(awaitingCount(a, latest(a.id)) > 0)
        || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 8);
    const designerStats = [
      { key: 'assigned', label: t('projects.stat.assigned'), value: all.length, icon: <FolderKanban className="h-5 w-5" />, tone: 'brand' as const },
      { key: 'action', label: t('projects.stat.needsMe'), value: needs(all), icon: <AlertCircle className="h-5 w-5" />, tone: 'amber' as const },
      { key: 'layout', label: t('projects.stat.layout'), value: count((p) => p.status === 'IN_DESIGN'), icon: <PencilRuler className="h-5 w-5" />, tone: 'blue' as const },
      { key: 'products', label: t('projects.stat.products'), value: count((p) => p.status === 'PRODUCT_SELECTION'), icon: <Package className="h-5 w-5" />, tone: 'violet' as const },
    ];

    const filters = (
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
          <span className="sr-only">{t('cards.search')}</span>
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setQuery({ q: e.target.value || null, page: null })} placeholder={t('cards.search')} className="pl-8" />
        </label>
        <Select aria-label={t('projects.col.status')} value={status} onChange={(e) => setQuery({ status: e.target.value || null, page: null })} className="w-full sm:w-48">
          <option value="">{t('projects.allStatuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.project.${s}`)}</option>)}
        </Select>
      </div>
    );

    return (
      <AppShell>
        {/* on a failed load, show only the error: no greeting count and no stat tiles reading 0 */}
        <PageHeader title={t(`projects.title.${role}`)} secondary={!error && filters}
          description={error ? t(`projects.description.${role}`) : <GreetingLine name={getCurrentUser()?.name} count={needs(all)} replies={all.reduce((n, p) => n + awaitingCount(p, latest(p.id)), 0)}
            draftNote={draftNote(all.flatMap((p) => knownVersion(latest(p.id))?.draftRooms ?? []))} unknown={all.filter((p) => !isClosed(p.status) && versionUnknown(latest(p.id))).length} onRetryAll={() => retryAll(all.filter((p) => !isClosed(p.status)).map((p) => p.id))} loading={loading || !ready} />} />
        {role === 'designer' && !error && <section aria-labelledby="designer-today-title" className="mb-6 space-y-4">
          <div className="flex items-center gap-2"><ClipboardList aria-hidden className="h-5 w-5 text-brand-text" /><h2 id="designer-today-title" className="text-lg font-bold text-ink">{t('staffUx.today.designerTitle')}</h2></div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{designerStats.map((item) => <StatCard key={item.key} label={item.label} value={item.value} loading={loading || (item.key === 'action' && !ready)} icon={item.icon} iconTone={item.tone} />)}</div>
          <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
            <h3 className="mb-3 text-[15px] font-semibold text-ink">{t('projects.stat.needsMe')}</h3>
            {loading || !ready ? <div aria-busy="true" className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>
              : designerActionItems.length ? <ul className="divide-y divide-line">{designerActionItems.map((p) => {
                const reason = (p.myProjectRole === 'LEAD' && gate(p.id) ? t('concepts.nextLead') : nextFor('designer', p, latest(p.id), gate(p.id))) || t(`status.project.${p.status}`);
                return <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{p.title} <span className="font-normal text-slate-500">· {p.code}</span></p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600"><AlertCircle aria-hidden className="h-3.5 w-3.5" />{reason}</p></div><Button size="sm" variant="primary" onClick={() => open(p)}>{t('projects.openWorkspace')}</Button></li>;
              })}</ul> : <p className="text-sm text-slate-600">{t('staffUx.today.designerDone')}</p>}
          </div>
        </section>}
        <ProjectCards role={role} projects={items && filtered} latest={latest} gate={gate} floors={cardFloors} error={error} onRetry={load}
          filteredOut={filteredOut} onClearFilters={clearFilters}
          onWorkspace={(p) => navigate(`/projects/${p.id}/workspace`)}
          onDetails={(p) => navigate(`/${role === 'designer' ? 'designer' : 'homeowner'}/projects/${p.id}`)}
          onRetryVersion={retry}
          filtering={!!search.trim() || !!status || quick !== 'all'}
          large={role === 'homeowner' && items?.length === 1} />
      </AppShell>
    );
  }

  const quickCounts = Object.fromEntries(QUICK_FILTERS.map((key) => [key, key === 'all' ? all.length : all.filter((p) => statusForQuick(p, key)).length])) as Record<QuickFilter, number>;
  const actionItems = [...all].filter((p) => attentionRank(p) < 4).sort((a, b) => attentionRank(a) - attentionRank(b) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 8);
  const activeItems = [...all].filter((p) => p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION').sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 8);
  const countCards = [
    { key: 'all' as QuickFilter, label: t('projects.stat.total'), value: items ? (overallTotal ?? all.length) : '—', icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.8} />, tone: 'brand' as const },
    { key: 'unassigned' as QuickFilter, label: t('projects.stat.noDesigner'), value: items ? quickCounts.unassigned : '—', icon: <UserRoundX className="h-5 w-5" strokeWidth={1.8} />, tone: 'amber' as const },
    { key: 'quotation' as QuickFilter, label: t('projects.stat.quoteHandover'), value: items ? count((p) => p.status === 'QUOTING' || p.status === 'COMPLETED') : '—', icon: <FileCheck2 className="h-5 w-5" strokeWidth={1.8} />, tone: 'orange' as const },
    { key: 'design' as QuickFilter, label: t('projects.stat.inDesign'), value: items ? quickCounts.design : '—', icon: <DraftingCompass className="h-5 w-5" strokeWidth={1.8} />, tone: 'blue' as const },
  ];
  const designerOptions = [...new Map(all.filter((p) => p.designer).map((p) => [p.designer!.id, p.designer!])).values()];
  const customerOptions = [...new Map(all.map((p) => [p.customer.id, p.customer])).values()];

  return (
    <AppShell wide>
      <PageHeader
        title={t(`projects.title.${role}`)}
        description={t('staffUx.today.description')}
        primary={(role === 'staff' || role === 'admin') && (
          <Button variant="primary" onClick={() => navigate('/staff/projects/new')}>
            <Plus aria-hidden className="h-4 w-4" />
            {t('projects.newProject')}
          </Button>
        )}
      />

      {staff && <section aria-labelledby="staff-today-title" className="mb-6 space-y-4">
        <div className="flex items-center gap-2"><ClipboardList aria-hidden className="h-5 w-5 text-brand-text" /><h2 id="staff-today-title" className="text-lg font-bold text-ink">{t('staffUx.today.title')}</h2></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {countCards.map((card) => (
            <button key={card.key} type="button"
              onClick={() => setQuery({ quick: card.key === 'all' ? null : card.key, status: null, designer: null, customer: null, q: null, page: null })}
              aria-pressed={quick === card.key || (card.key === 'all' && quick === 'all')}
              className="rounded-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <StatCard label={card.label} value={card.value} loading={!items && !error} icon={card.icon} iconTone={card.tone} />
            </button>
          ))}
        </div>
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

      {!staff && <div className={`mb-5 grid gap-3 ${stats.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} loading={!items && !error}
            icon={s.icon} iconTone={s.tone} attention={s.attention}
            active={s.quick !== null && quick === s.quick}
            title={s.quick ? t('projects.quickFilterHint') : undefined}
            onClick={items ? () => setQuery({ quick: s.quick === quick ? null : s.quick, page: null }) : undefined} />
        ))}
      </div>}

      {staff && items && <div className="mb-3 flex flex-wrap gap-2" aria-label={t('staffUx.quick.label')}>
        {QUICK_FILTERS.map((key) => (
          <button key={key} type="button" aria-pressed={quick === key}
            onClick={() => setQuery({ quick: key === 'all' ? null : key, page: null })}
            className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${quick === key ? 'border-brand bg-brand-soft text-brand-text' : 'border-line bg-surface text-slate-700 hover:bg-sand-50'}`}>
            <span>{t(`staffUx.quick.${key}`)}</span>
            <span className="rounded-full bg-sand-100 px-1.5 text-xs tabular-nums">{quickCounts[key]}</span>
          </button>
        ))}
      </div>}

      <div className="mb-3 space-y-2">
        <FilterBar search={search} onSearch={(v) => setQuery({ q: v || null, page: null })} placeholder={t('projects.searchPlaceholder')}>
          <Select aria-label={t('projects.col.status')} value={status} onChange={(e) => setQuery({ status: e.target.value || null, page: null })} className="w-full sm:w-48">
            <option value="">{t('projects.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.project.${s}`)}</option>)}
          </Select>
          {staff && <Select aria-label={t('projects.col.designer')} value={designerFilter} onChange={(e) => setQuery({ designer: e.target.value || null, page: null })} className="w-full sm:w-48"><option value="">{t('staffUx.filters.allDesigners')}</option>{designerOptions.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}</Select>}
          {staff && <Select aria-label={t('projects.col.homeowner')} value={customerFilter} onChange={(e) => setQuery({ customer: e.target.value || null, page: null })} className="w-full sm:w-48"><option value="">{t('staffUx.filters.allCustomers')}</option>{customerOptions.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</Select>}
          {staff && <Select aria-label={t('staffUx.sort.label')} value={sortMode} onChange={(e) => setQuery({ sort: e.target.value, page: null })} className="w-full sm:w-48"><option value="attention">{t('staffUx.sort.attention')}</option><option value="updated">{t('staffUx.sort.updated')}</option><option value="name">{t('staffUx.sort.name')}</option><option value="budget">{t('staffUx.sort.budget')}</option></Select>}
        </FilterBar>

        {items && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>{t('staffUx.filters.results', { shown: sorted.length, total: overallTotal ?? all.length })}{all.length < (overallTotal ?? all.length) ? ` · ${t('staffUx.filters.loaded', { count: all.length })}` : ''}</span>
          {(search || status || quick !== 'all' || designerFilter || customerFilter) && <Button size="sm" variant="ghost" onClick={clearFilters}>{t('projects.clearFilters')}</Button>}
        </div>}
      </div>

      {quickLabel && (
        <div className="step-in mb-3 flex items-center gap-2 text-[13px] text-slate-600">
          {t('projects.quickFilterShowing')}
          <button type="button" onClick={() => setQuery({ quick: null, page: null })} aria-label={`${t('projects.clearFilters')}: ${quickLabel}`}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-brand-soft py-0.5 pl-2.5 pr-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/15 focus-visible:outline-2 focus-visible:outline-brand">
            {quickLabel}
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={items ? sorted : null}
        rowKey={(p) => p.id}
        error={error}
        onRetry={load}
        onRowClick={open}
        onPageRows={loadFloors}
        pageSize={10}
        pageState={page}
        onPageChange={(next) => setQuery({ page: next ? String(next) : null })}
        empty={filteredOut
          ? <EmptyState title={t('projects.empty.filtered')} action={<Button size="sm" onClick={clearFilters}>{t('projects.clearFilters')}</Button>} />
          : <EmptyState title={t(`projects.empty.${role}`)} action={(role === 'staff' || role === 'admin') && <Button variant="primary" size="sm" onClick={() => navigate('/staff/projects/new')}>{t('projects.newProject')}</Button>} />}
      />
    </AppShell>
  );
}

export default ProjectList;
