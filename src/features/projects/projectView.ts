import { useCallback, useEffect, useRef, useState } from 'react';
import { formatNumber, t, tList } from '@/i18n';
import type { UserRole } from '@/types/role';
import { designApi } from '@/features/design-workspace/designApi';
import type { Role, VersionStatus, VersionType } from '@/features/design-workspace/types';
import { countWaitingForMe, versionLabel } from '@/features/design-workspace/logic';
import { isPreparing, nextStep, projectApi, stepIndex } from './projectApi';
import type { Project } from './projectApi';

/*
 * TODO: when the project list API returns latestVersionStatus and floorCount, read them from the list
 * and drop the extra per-project requests below (useFloorCounts, useLatestVersions).
 * TODO: when it also returns awaitingReplyCount, drop the per-project comments request in useLatestVersions.
 */

const STEPS_TOTAL = 7;
const MAX_PARALLEL = 4;

/**
 * Runs at most MAX_PARALLEL requests at a time for the project list (floors, versions, thumbnails).
 * 'high' jobs (latest versions, which decide the groups) start before any waiting 'normal' job (floor counts, thumbnails);
 * 'low' jobs (completed projects' final version, which decides no group) go last.
 */
let running = 0;
type Priority = 'high' | 'normal' | 'low';
const waiting: Record<Priority, (() => void)[]> = { high: [], normal: [], low: [] };
export function queued<T>(job: () => Promise<T>, priority: Priority = 'normal'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      running++;
      job().then(resolve, reject).finally(() => { running--; (waiting.high.shift() ?? waiting.normal.shift() ?? waiting.low.shift())?.(); });
    };
    if (running < MAX_PARALLEL) start(); else waiting[priority].push(start);
  });
}

/** awaiting = open comment threads on this version whose latest message is from the other side (waitingForMe). */
export interface LatestVersion { id: string; label: string; status: VersionStatus; type: VersionType; awaiting: number }
/** null = the project has no version yet; 'error' = the request failed (never treated as "no version"); 'checking' = retrying. */
export type LatestState = LatestVersion | null | 'error' | 'checking';
/** The latest version could not be determined (failed or being retried). */
export const versionUnknown = (l: LatestState | undefined): l is 'error' | 'checking' => l === 'error' || l === 'checking';
/** The version itself, when one is known. */
export const knownVersion = (l: LatestState | undefined): LatestVersion | null => (l && typeof l === 'object' ? l : null);

/** Comment threads waiting for my reply on the latest version; 0 once the project is closed. */
export const awaitingCount = (p: Pick<Project, 'status'>, latest: LatestState | undefined) =>
  p.status === 'COMPLETED' || p.status === 'CANCELLED' ? 0 : knownVersion(latest)?.awaiting ?? 0;

/**
 * Who has to act:
 * - Designer: layout or products are open and the latest version is not waiting on the homeowner.
 * - Homeowner: the latest version was sent to them (SUBMITTED).
 */
export function needsAction(role: UserRole, p: Pick<Project, 'status'>, latest: LatestState | undefined) {
  if (versionUnknown(latest)) return false;
  // a comment waiting for my reply puts the project in "Needs your action" for both sides
  if ((role === 'designer' || role === 'homeowner') && awaitingCount(p, latest) > 0) return true;
  if (role === 'designer') return (p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION') && latest?.status !== 'SUBMITTED';
  if (role === 'homeowner') return latest?.status === 'SUBMITTED' && p.status !== 'CANCELLED' && p.status !== 'COMPLETED';
  return false;
}

/**
 * "Next" line that agrees with the latest version, so a card never says "act" while sitting under "Waiting on others".
 * Falls back to the per-status sentence (nextStep) when no version is known.
 */
export function nextFor(role: UserRole, p: Pick<Project, 'status' | 'designer'>, latest: LatestState | undefined): string {
  // a closed project has nothing left to decide, whatever its version check returned
  if (isClosed(p.status)) return nextStep(role, p as Project);
  if (versionUnknown(latest)) return '';
  // the decision for this stage leads; waiting replies follow as a second sentence (the chip carries the count too)
  const main = stageSentence(role, p, latest);
  const replies = awaitingCount(p, latest);
  if (!replies || (role !== 'designer' && role !== 'homeowner')) return main;
  const tail = t(`next.replies.${role}`, { n: replies });
  return main ? `${main} ${tail}` : tail;
}

function stageSentence(role: UserRole, p: Pick<Project, 'status' | 'designer'>, latest: LatestState | undefined): string {
  const designing = p.status === 'IN_DESIGN' || p.status === 'PRODUCT_SELECTION';
  if (!designing || latest === undefined || (role !== 'designer' && role !== 'homeowner')) return nextStep(role, p as Project);
  const stage = p.status === 'IN_DESIGN' ? 'layout' : 'products';
  const v = knownVersion(latest)?.label ?? '';
  if (role === 'homeowner') {
    const d = designLabel(v);
    if (knownVersion(latest)?.status === 'SUBMITTED') return t('next.homeowner.review', { v: d });
    if (knownVersion(latest)?.status === 'REVISION_REQUESTED') return t('next.homeowner.revising', { v: d });
    return t(`next.homeowner.working.${stage}`);
  }
  const ver = knownVersion(latest);
  if (!ver) return t(`next.designer.first.${stage}`);
  if (ver.status === 'SUBMITTED') return t('next.designer.waiting', { v });
  if (ver.status === 'REVISION_REQUESTED') return t(`next.designer.changes.${stage}`, { v });
  return nextStep(role, p as Project);
}

/** Projects with a version worth loading: in design, quotation, or completed (its final design). Cancelled ones are skipped. */
export const needsCheck = (p: Pick<Project, 'status'>) => !isPreparing(p.status) && p.status !== 'CANCELLED';

/** Homeowners see "Design 3" instead of the internal version label "v3" (v1.2 → Design 1.2). */
export const designLabel = (label: string) => versionLabel(label, 'homeowner');

/** Completed or cancelled: nothing left to act on, so never "needs action" or "couldn't check". */
export const isClosed = (s: Project['status']) => s === 'COMPLETED' || s === 'CANCELLED';

/** The AI concept stage is not built yet: shown as an optional step, never auto-checked. index = its position in the step list. */
export const conceptStep = (index: number) => ({ index, tag: t('steps.conceptTag'), hint: t('steps.conceptHint') });

/**
 * Progress along the 7 project steps; null for a cancelled project.
 * Designers read "Step 4/7 · Layout"; homeowners only the stage name ("Layout").
 */
export function stepProgress(p: Pick<Project, 'status'>, role: UserRole = 'designer') {
  const i = stepIndex(p.status);
  if (i < 0) return null;
  const steps = tList('steps.project');
  const plain = role === 'homeowner';
  if (i >= STEPS_TOTAL) return { ratio: 1, label: plain ? t('cards.finished') : t('cards.allDone', { total: STEPS_TOTAL }) };
  return { ratio: i / STEPS_TOTAL, label: plain ? steps[i] : t('cards.step', { n: i + 1, total: STEPS_TOTAL, label: steps[i] }) };
}

/** One amount in its own unit: under 1 million in full, then million, then billion (one decimal at most). */
function moneyUnit(v: number): { unit: 'full' | 'million' | 'billion'; text: string } {
  const f = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-US');
  if (v >= 1e9) return { unit: 'billion', text: f(v / 1e9) };
  if (v >= 1e6) return { unit: 'million', text: f(v / 1e6) };
  return { unit: 'full', text: formatNumber(Math.round(v)) };
}

/**
 * Budget for the card, display only. Both ends share a unit when they can ("600–900 million ₫");
 * otherwise each end carries its own ("200,000 ₫ – 500 million ₫").
 */
export function budgetShort(min: string, max: string) {
  const lo = moneyUnit(Number(min)), hi = moneyUnit(Number(max));
  if (lo.unit === hi.unit) return t(`cards.budgetRange.${hi.unit}`, { min: lo.text, max: hi.text });
  return t('cards.budgetMixed', { min: t(`cards.budgetOne.${lo.unit}`, { v: lo.text }), max: t(`cards.budgetOne.${hi.unit}`, { v: hi.text }) });
}

export const shortAddress = (address: string | null | undefined) => address?.split(',')[0]?.trim() ?? '';
export const unitLabel = (a: Project['apartment']) => [a.buildingName, a.tower, a.unitNo].filter(Boolean).join(', ');
export const byUpdated = (a: Project, b: Project) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);

/** "Good morning" etc. by the hour in Vietnam. */
export function greeting(name: string | undefined, now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hourCycle: 'h23' }).format(now));
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const full = name?.trim().replace(/\s+/g, ' ');
  return full ? t(`cards.greet.${part}`, { name: full }) : t(`cards.greet.${part}Anon`);
}

/** Floor count per project id (undefined = loading, null = failed). */
export function useFloorCounts(projects: Project[] | null) {
  const [floors, setFloors] = useState<Record<string, number | null>>({});
  const requested = useRef(new Set<string>());
  useEffect(() => {
    for (const p of projects ?? []) {
      if (requested.current.has(p.id)) continue;
      requested.current.add(p.id);
      queued(() => projectApi.get(p.id)).then(
        (d) => setFloors((x) => ({ ...x, [p.id]: d.apartment.floors?.length ?? 0 })),
        () => setFloors((x) => ({ ...x, [p.id]: null })),
      );
    }
  }, [projects]);
  return floors;
}

/**
 * Latest design version (any stage) per project. ready once every project is known; a failed request counts as known
 * ('error'), so the list still renders and that card offers Retry. retry(id) re-checks one project ('checking').
 */
export function useLatestVersions(projects: Project[] | null, me: Role) {
  const [latest, setLatest] = useState<Record<string, LatestState>>({});
  const requested = useRef(new Set<string>());
  const fetchOne = useCallback((id: string, priority: Priority = 'high') => {
    const list = (type: VersionType) => queued(() => designApi.listVersions(id, type), priority).then((r) => r.items);
    Promise.all([list('LAYOUT_2D'), list('RENDER_3D')]).then(async ([layout, render]) => {
      const top = [...layout, ...render].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (!top) return null;
      // comments on the latest version, same priority as the versions; a failure is an error, never "0 waiting"
      const comments = await queued(() => designApi.listComments(top.id), priority);
      return { id: top.id, label: top.label, status: top.status, type: top.version_type, awaiting: countWaitingForMe(comments, me) };
    }).then((v) => setLatest((x) => ({ ...x, [id]: v })), () => setLatest((x) => ({ ...x, [id]: 'error' })));
  }, [me]);
  useEffect(() => {
    for (const p of projects ?? []) {
      if (requested.current.has(p.id)) continue;
      requested.current.add(p.id);
      // nothing to check before design starts, or once the project is closed
      if (!needsCheck(p)) continue;
      // a completed project's final design decides no group: load it after everything else
      fetchOne(p.id, p.status === 'COMPLETED' ? 'low' : 'high');
    }
  }, [projects, fetchOne]);
  const retry = useCallback((id: string) => { setLatest((x) => ({ ...x, [id]: 'checking' })); fetchOne(id); }, [fetchOne]);
  /** "Try again" in the greeting: re-check the given projects whose check failed (the caller passes open projects only). */
  const retryAll = useCallback((ids: string[]) => {
    for (const id of ids) if (latest[id] === 'error') retry(id);
  }, [latest, retry]);
  // closed projects never hold the list (or the greeting) back
  const ready = !!projects && projects.every((p) => !needsCheck(p) || isClosed(p.status) || p.id in latest);
  return { latest: (id: string): LatestState | undefined => latest[id], ready, retry, retryAll };
}
