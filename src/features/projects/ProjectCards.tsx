import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CircleCheck, FolderOpen, House, MessageSquare } from 'lucide-react';
import { Button, ErrorState, StatusChip, statusInfo } from '@/components/ui';
import type { Tone } from '@/components/ui';
import { TONE_CLASS } from '@/components/ui/status';
import { formatDate, t } from '@/i18n';
import { canOpenWorkspace } from './projectApi';
import type { Project } from './projectApi';
import { PlanThumb } from './PlanThumb';
import { awaitingCount, budgetShort, byUpdated, greeting, isClosed, knownVersion, needsAction, needsCheck, nextFor, stepProgress, unitLabel, versionUnknown } from './projectView';
import type { LatestState } from './projectView';

type CardRole = 'designer' | 'homeowner';

/** Flat light tint behind the house icon (no drawing yet), following the status chip colour. */
const THUMB: Record<Tone, string> = {
  gray: 'bg-slate-50 text-slate-400',
  sky: 'bg-sky-50 text-sky-500',
  blue: 'bg-blue-50 text-blue-500',
  violet: 'bg-violet-50 text-violet-500',
  orange: 'bg-orange-50 text-orange-500',
  yellow: 'bg-yellow-50 text-yellow-600',
  amber: 'bg-amber-50 text-amber-600',
  green: 'bg-emerald-50 text-emerald-500',
  red: 'bg-rose-50 text-rose-400',
  struck: 'bg-slate-50 text-slate-300',
};

/** Filled part of the progress rule: the status chip hue at tone 400, so the bar reads as the stage, not as an action. */
const BAR: Record<Tone, string> = {
  gray: 'bg-slate-400', sky: 'bg-sky-400', blue: 'bg-blue-400', violet: 'bg-violet-400', orange: 'bg-orange-400',
  yellow: 'bg-yellow-400', amber: 'bg-amber-400', green: 'bg-emerald-400', red: 'bg-rose-400', struck: 'bg-slate-300',
};

const Spinner = () => <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />;

interface CardProps {
  p: Project;
  role: CardRole;
  latest: LatestState | undefined;
  floors: number | null | undefined;
  large: boolean;
  /** First card of "Needs your action": the only one whose button is filled. */
  lead: boolean;
  onWorkspace: (p: Project) => void;
  onDetails: (p: Project) => void;
  onRetryVersion: (id: string) => void;
}

function ProjectCard({ p, role, latest, floors, large, lead, onWorkspace, onDetails, onRetryVersion }: CardProps) {
  const tone = statusInfo('project', p.status).tone;
  const urgent = needsAction(role, p, latest);
  const progress = stepProgress(p, role);
  const next = nextFor(role, p, latest);
  const replies = awaitingCount(p, latest);
  const workspace = canOpenWorkspace(p.status);
  // still waiting for the first check, or the check failed / is being retried
  // a closed project never shows a check status: it has nothing left to act on
  const pending = !isClosed(p.status) && needsCheck(p) && (latest === undefined || versionUnknown(latest));
  const retryable = latest === 'error' || latest === 'checking';
  // Designer: the card opens the workspace. Homeowner: the card opens the overview.
  // The title is a real link whose hit area covers the card (keyboard and screen-reader friendly); buttons sit above it.
  const cardHref = role === 'designer' ? (workspace ? `/projects/${p.id}/workspace` : null) : `/homeowner/projects/${p.id}`;
  const a = p.apartment;
  // the most human fact first, so a 2-line clamp at 375px cuts the code, not the name
  const meta = role === 'designer'
    ? [p.customer.fullName, unitLabel(a), p.code]
    : [unitLabel(a), p.designer ? t('cards.designer', { name: p.designer.fullName }) : t('cards.awaitingDesigner')];
  const updated = t('cards.updated', { date: formatDate(p.updatedAt ?? p.createdAt) });
  const variant = urgent && lead ? 'primary' : 'secondary';

  // "Next" (or the check status): inside the info column from lg, a full-width row below it on narrow cards
  const slot = (className: string) => pending ? (
    <p className={`relative z-10 flex flex-wrap items-center gap-x-1.5 text-[13px] ${latest === 'error' ? 'text-amber-800' : 'text-slate-500'} ${className}`}>
      {/* mounted before the state changes, so "Checking…" / "Couldn't check…" is announced */}
      <span aria-live="polite">{latest === 'error' ? t(`cards.checkFailed.${role}`) : t(`cards.checking.${role}`)}</span>
      {retryable && (
        <>
          <span aria-hidden>·</span>
          <button type="button" aria-disabled={latest === 'checking'} aria-label={t('cards.retryFor', { project: p.title })}
            onClick={() => latest === 'error' && onRetryVersion(p.id)}
            className="-my-0.5 inline-flex min-h-6 items-center gap-1.5 rounded px-1.5 font-medium underline underline-offset-2 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand aria-disabled:cursor-wait aria-disabled:no-underline">
            {latest === 'checking' && <Spinner />}
            {t('common.retry')}
          </button>
        </>
      )}
    </p>
  ) : next ? (
    <p className={`flex min-w-0 items-start gap-1.5 text-[13px] text-slate-700 ${className}`}>
      {urgent && <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
      <span className="line-clamp-2">{t('cards.next', { text: next })}</span>
    </p>
  ) : null;

  // [thumb][info][progress][actions] from 1024px (lg); below it the thumb stays beside the info and
  // next, progress and actions each take a full-width row underneath.
  const cols = large ? 'grid-cols-[136px_minmax(0,1fr)] lg:grid-cols-[136px_minmax(0,1fr)_180px_auto]' : 'grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[96px_minmax(0,1fr)_180px_auto]';
  return (
    <li>
      <article
        className={`relative grid items-center gap-x-3 gap-y-3 rounded-card border bg-surface shadow-card transition-colors lg:gap-x-5 has-[[data-card-link]:focus-visible]:outline-2 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-brand ${cols} ${large ? 'p-4' : 'p-3'} ${cardHref ? 'hover:border-line-strong' : ''} ${urgent ? 'border-orange-200' : 'border-line'}`}>
        <div className={`relative ${large ? 'h-[88px]' : 'h-16'}`}>
          <PlanThumb versionId={knownVersion(latest)?.id ?? null} className="h-full w-full rounded-xl"
            fallback={(
              <div className={`flex h-full w-full items-center justify-center ${THUMB[tone]}`}>
                {/* completed and its final design couldn't be loaded: a check mark, not an error */}
                {p.status === 'COMPLETED' && versionUnknown(latest)
                  ? <CircleCheck className={large ? 'h-8 w-8' : 'h-6 w-6'} strokeWidth={1.6} />
                  : <House className={large ? 'h-8 w-8' : 'h-6 w-6'} strokeWidth={1.6} />}
              </div>
            )} />
          {floors != null && (
            <span className="absolute bottom-1 left-1 rounded-full border border-line bg-surface px-1.5 text-[11px] font-medium leading-4 text-slate-600">{t('projects.floors', { n: floors })}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 truncate text-[15px] font-bold text-slate-900">
              {cardHref
                ? <Link to={cardHref} data-card-link className="outline-none after:absolute after:inset-0 after:rounded-card after:content-['']">{p.title}</Link>
                : p.title}
            </h3>
            <StatusChip kind="project" value={p.status} size="sm" />
            {role === 'designer' && p.myProjectRole && <StatusChip kind="projectRole" value={p.myProjectRole} size="sm" />}
            {replies > 0 && <RepliesChip n={replies} />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">{meta.filter(Boolean).join(' · ')}</p>
          {p.myProjectRole === 'MEMBER' && !!p.myRooms?.length && (
            <p className="mt-0.5 truncate text-xs text-slate-600">{t('cards.yourRooms', { rooms: p.myRooms.map((r) => r.name).join(', ') })}</p>
          )}
          {role === 'homeowner' && (
            <p className="mt-0.5 text-xs tabular-nums text-slate-600">{t('cards.budget', { range: budgetShort(p.budgetMin, p.budgetMax) })}</p>
          )}
          {slot('mt-1.5 hidden lg:flex')}
        </div>

        {slot('col-span-2 lg:hidden')}

        <div className="col-span-2 min-w-0 lg:col-span-1">
          {progress && (
            <>
              <div role="progressbar" aria-label={progress.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)}
                className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.max(progress.ratio * 100, 4)}%` }} />
              </div>
              <p aria-hidden className="mt-1.5 truncate text-xs tabular-nums text-slate-600">{progress.label}</p>
            </>
          )}
          <p className={`${progress ? 'mt-0.5' : ''} text-xs tabular-nums text-slate-500`}>{updated}</p>
        </div>

        <div className="relative z-10 col-span-2 flex items-center justify-end gap-3 lg:col-span-1">
          {role === 'designer' ? (
            <>
            <Button size="sm" variant="ghost" onClick={() => onDetails(p)} aria-label={t('cards.actionFor', { action: t('cards.viewProject'), project: p.title })}>{t('cards.viewProject')}</Button>
            {workspace
              ? <Button size="sm" variant={variant} onClick={() => onWorkspace(p)} aria-label={t('cards.actionFor', { action: t('projects.openWorkspace'), project: p.title })}>{t('projects.openWorkspace')}</Button>
              : <span className="max-w-[160px] text-right text-xs text-slate-500">{t('cards.notOpenYet')}</span>}
            </>
          ) : workspace ? (
            // the title already links to the overview; this one goes straight into the design
            <Button size="sm" variant={variant} onClick={() => onWorkspace(p)} aria-label={t('cards.actionFor', { action: t('homeownerDetail.openDesign'), project: p.title })}>{t('homeownerDetail.openDesign')}</Button>
          ) : <Button size="sm" onClick={() => onDetails(p)} aria-label={t('cards.actionFor', { action: t('cards.viewProject'), project: p.title })}>{t('cards.viewProject')}</Button>}
        </div>
      </article>
    </li>
  );
}

function CardSkeleton() {
  return (
    <li aria-hidden className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card lg:grid-cols-[96px_minmax(0,1fr)_180px_auto] lg:gap-x-5">
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="min-w-0 space-y-2">
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="col-span-2 space-y-1.5 lg:col-span-1">
        <div className="h-1 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="col-span-2 ml-auto h-8 w-32 animate-pulse rounded-lg bg-slate-100 lg:col-span-1" />
    </li>
  );
}

/**
 * Greeting line for the page header: who you are and how many projects wait on you.
 * Never says "nothing needs you" while some projects could not be checked.
 */
export function GreetingLine({ name, count, replies = 0, unknown = 0, draftNote = '', onRetryAll, loading }: {
  name?: string; count: number; replies?: number; unknown?: number; /** Member: drafts not marked ready. */ draftNote?: string; onRetryAll?: () => void; loading: boolean;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{greeting(name)}.</span>
      {loading ? <span aria-hidden className="inline-block h-4 w-48 animate-pulse rounded bg-slate-100 align-middle" /> : (
        <>
          {count > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 font-medium text-orange-800">
              <span aria-hidden className="min-w-[20px] rounded-full bg-orange-100 px-1.5 text-center text-[11px] font-bold leading-5 text-orange-800">{count}</span>
              <span aria-hidden>{t('cards.greetCountRest', { n: count })}</span>
              <span className="sr-only">{t('cards.greetCount', { n: count })}</span>
            </span>
          ) : unknown === 0 && <span>{t('cards.greetNone')}</span>}
          {/* same number as the comment chips on the cards; the separator travels with the fragment it introduces */}
          {count > 0 && replies > 0 && <span className="whitespace-nowrap text-slate-600"><span aria-hidden>· </span>{t('cards.greetReplies', { n: replies })}</span>}
          {draftNote && <span className="text-slate-700"><span aria-hidden>· </span>{draftNote}</span>}
          {unknown > 0 && (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 text-amber-800">
              {t('cards.greetUnknown', { n: unknown })}
              {onRetryAll && (
                <button type="button" onClick={onRetryAll}
                  className="-my-0.5 inline-flex min-h-6 items-center rounded px-1.5 font-medium underline underline-offset-2 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand">
                  {t('cards.tryAgainAll')}
                </button>
              )}
            </span>
          )}
        </>
      )}
    </span>
  );
}

/** Small chip: open comment threads whose latest message is from the other side. Colour from the one status map. */
function RepliesChip({ n }: { n: number }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-4 ${TONE_CLASS[statusInfo('flag', 'NEEDS_ME').tone]}`}>
      <MessageSquare aria-hidden className="h-3 w-3" strokeWidth={2.4} />
      <span aria-hidden>{n}</span>
      <span className="sr-only">{t('cards.repliesChip', { n })}</span>
    </span>
  );
}

interface Props {
  role: CardRole;
  /** Filtered projects; null = loading. */
  projects: Project[] | null;
  latest: (id: string) => LatestState | undefined;
  onRetryVersion: (id: string) => void;
  /** A search or status filter is active: the Done group opens so matches are not hidden. */
  filtering?: boolean;
  floors: Record<string, number | null>;
  error: string;
  onRetry: () => void;
  /** Projects exist but the search/status filter hides them all. */
  filteredOut: boolean;
  onClearFilters: () => void;
  onWorkspace: (p: Project) => void;
  onDetails: (p: Project) => void;
  /** Bigger card (homeowner with a single project). */
  large?: boolean;
}

type GroupKey = 'checking' | 'failed' | 'action' | 'waiting' | 'done';

/**
 * Cards render as soon as the project list arrives. Projects still being checked sit in "Checking…" and move into
 * their group once known; a failed check stays under "Couldn't check" (also while retrying, so focus stays on Retry).
 */
export function ProjectCards({ role, projects, latest, floors, error, onRetry, filteredOut, onClearFilters, onWorkspace, onDetails, onRetryVersion, filtering = false, large = false }: Props) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!projects) return <ul aria-busy="true" className="space-y-2.5">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</ul>;
  if (!projects.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><FolderOpen className="h-7 w-7" strokeWidth={1.6} /></span>
        <p className="max-w-sm text-sm text-slate-600">{filteredOut ? t('projects.empty.filtered') : t(`cards.empty.${role}`)}</p>
        {filteredOut && <Button size="sm" onClick={onClearFilters}>{t('projects.clearFilters')}</Button>}
      </div>
    );
  }
  const state = (p: Project) => latest(p.id);
  const live = (p: Project) => !isClosed(p.status);
  const loading = (p: Project) => live(p) && needsCheck(p) && state(p) === undefined;
  const failed = (p: Project) => live(p) && versionUnknown(state(p));
  const known = (p: Project) => live(p) && !loading(p) && !failed(p);
  const groups: { key: GroupKey; items: Project[] }[] = [
    { key: 'failed', items: projects.filter(failed) },
    { key: 'checking', items: projects.filter(loading) },
    { key: 'action', items: projects.filter((p) => known(p) && needsAction(role, p, state(p))) },
    { key: 'waiting', items: projects.filter((p) => known(p) && !needsAction(role, p, state(p))) },
    { key: 'done', items: projects.filter((p) => !live(p)) },
  ];
  return (
    <div className="space-y-6">
      {groups.filter((g) => g.items.length).map((g) => (
        <CardGroup key={g.key} group={g.key} items={[...g.items].sort(byUpdated)} forceOpen={filtering} render={(p, i) => (
          <ProjectCard key={p.id} p={p} role={role} latest={state(p)} floors={floors[p.id]} large={large} lead={g.key === 'action' && i === 0}
            onWorkspace={onWorkspace} onDetails={onDetails} onRetryVersion={onRetryVersion} />
        )} />
      ))}
    </div>
  );
}

/** One titled group of cards. "Done" (completed or cancelled) starts collapsed and is fully shown while a filter is active. */
function CardGroup({ group, items, render, forceOpen }: { group: GroupKey; items: Project[]; render: (p: Project, i: number) => ReactNode; forceOpen: boolean }) {
  const [expanded, setExpanded] = useState(group !== 'done');
  const collapsible = group === 'done' && !forceOpen;
  const open = expanded || !collapsible;
  const id = `group-${group}`;
  const title = (
    <>
      {group === 'action' && <span aria-hidden className="h-2 w-2 rounded-full bg-orange-500" />}
      {group === 'checking' && <Spinner />}
      {t(`cards.group.${group}`)}
      <span className="rounded-full bg-slate-100 px-2 text-xs font-medium leading-5 text-slate-600">{items.length}</span>
    </>
  );
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={`mb-2.5 text-[13px] font-semibold ${group === 'failed' ? 'text-amber-800' : 'text-slate-700'}`}>
        {collapsible ? (
          <button type="button" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => setExpanded(!expanded)}
            className="flex min-h-6 items-center gap-2 rounded hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <ChevronRight aria-hidden className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
            {title}
          </button>
        ) : <span className="flex items-center gap-2">{title}</span>}
      </h2>
      {/* always mounted so aria-controls points at a real element; hidden while collapsed */}
      <ul id={`${id}-list`} hidden={!open} className="space-y-2.5">{items.map(render)}</ul>
    </section>
  );
}
