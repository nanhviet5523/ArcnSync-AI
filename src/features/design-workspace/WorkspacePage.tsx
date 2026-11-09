import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useBlocker, useParams, useSearchParams } from 'react-router-dom';
import { Box, Image as ImageIcon, Info, PanelLeftOpen, Upload } from 'lucide-react';
import { Avatar, Banner, Button, ErrorState, Field, Input, Modal, Skeleton, Textarea, Z, avatarLabels } from '@/components/ui';
import { downloadFile, revokeBlobUrls } from '@/services/authService';
import { errorText, isNetworkError, t } from '@/i18n';
import { projectApi } from '@/features/projects/projectApi';
import { designApi } from './designApi';
import { approveBlockers, can, CLEAR_CANVAS, commentPlaceholder, commentThreads, compareCandidates, newUploadRow, pickCompareTarget, resolveProjectRole, uploadRowErrors, elementName, formatTime, latestVersion, targetInVersion, versionLabel, isNotChosenItem, isUnknownItem, pinPoint, pinsToShow } from './logic';
import type { Action, CanvasUi, CommentThread, UploadRow } from './logic';
import { CommentPanel } from './CommentPanel';
import { ComparePanel } from './ComparePanel';
import { FloorRoomTree } from './FloorRoomTree';
import { Plan2D } from './Plan2D';
import { frame, ZOOM_IN, ZOOM_OUT } from './view';
import type { ClickPoint, Layers, Pin, Plan2DHandle, ViewBox } from './Plan2D';
import { LazyScene3D } from './LazyScene3D';
import type { NavMode, Scene3DHandle } from './Scene3D';
import { ItemPanel } from './ItemPanel';
import { CatalogDrawer } from './CatalogDrawer';
import { RoomPanel } from './RoomPanel';
import { CanvasMenu, CanvasToolbar, SceneToggles } from './CanvasToolbar';
import { WorkspaceBar } from './WorkspaceBar';
import { CommentHint, QuickComment } from './QuickComment';
import { ProjectInfoDrawer } from './ProjectInfoDrawer';
import { RoomOwnerMenu } from './RoomOwnerMenu';
import { ChangeSummary, MemberDraftBar, RoomDraftsBlock } from './RoomDraftBars';
import { useRoomWork } from './useRoomWork';
import { changeCount, draftPatches, droppedItemNames, foldOwnDrafts, localChangesInRoom, skippedRoomNames, mergePatches, mergeSummary, olderVersionDraftSource, previewHighlight, signedVnd, suggestedAddressed, withPatches } from './roomDrafts';
import type { ChangeLine, MemberDraftRow, Patches } from './roomDrafts';
import { boxOf, elementRoom, floorRooms, roomAt } from './rooms';
import type { RoomInfo } from './rooms';
import type { Comment, CommentTarget, DesignElement, DesignVersion, Floor, Project, RevisionLimit, RevisionType, Role, RoomDraft, VersionSummary } from './types';

/** Workspace steps (steps.workspace): Concept, Layout, Products, Quotation, Approved. Completed = all done. */
const STEP_OF: Partial<Record<Project['status'], number>> = { IN_DESIGN: 1, PRODUCT_SELECTION: 2, QUOTING: 3, COMPLETED: 5 };

/** "Show furniture" off: 3D gets this stable empty list, so the camera stays put. */
const NO_ELEMENTS: DesignElement[] = [];

/** Lights and Ceiling: remembered for this browser tab, never stored with the version. */
const SCENE_KEY = 'workspace.scene3d';
const SCENE_DEFAULT = { lights: false, ceiling: false };
function readScene() {
  try { return { ...SCENE_DEFAULT, ...JSON.parse(sessionStorage.getItem(SCENE_KEY) ?? '{}') } as typeof SCENE_DEFAULT; } catch { return SCENE_DEFAULT; }
}

/** Shortcuts stay off while typing. A checkbox or switch that merely has focus is not typing. */
const isTyping = (el: HTMLElement | null) => !!el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName)
  || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes((el as HTMLInputElement).type)));

/** 2D view that frames a room: its outline, or a 5 m square around the label when it has none. */
const roomView = (r: RoomInfo): ViewBox => (r.boundary ? frame(r.boundary, 0.8) : { x: r.label[0] - 2.5, y: -r.label[1] - 2.5, w: 5, h: 5 });

const projectsHome = (role: Role) => (role === 'designer' ? '/designer/projects' : role === 'homeowner' ? '/homeowner/projects' : '/staff/projects');

/** Below 1024px the side columns are drawers (Tailwind `lg`). */
const NARROW = '(max-width: 1023.98px)';
const isNarrow = () => window.matchMedia(NARROW).matches;
const watchNarrow = (cb: () => void) => {
  const m = window.matchMedia(NARROW);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};

function RevisionPicker({ value, onChange, limit, major }: { value: RevisionType; onChange: (r: RevisionType) => void; limit: RevisionLimit | null; major: { ok: boolean; reason?: string } }) {
  return (
    <fieldset>
      <div className="grid grid-cols-2 gap-2">
        {(['MINOR', 'MAJOR'] as const).map((r) => {
          const off = r === 'MAJOR' && !major.ok;
          return (
            <label key={r} className={`rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${off ? 'cursor-not-allowed border-line opacity-60' : value === r ? 'cursor-pointer border-brand bg-brand-soft' : 'cursor-pointer border-line hover:border-line-strong'}`}>
              <input type="radio" name="revision" className="sr-only" checked={value === r} disabled={off} onChange={() => onChange(r)} />
              <span className="font-medium text-slate-900">{t(r === 'MINOR' ? 'workspace.minor' : 'workspace.major')}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{t(r === 'MINOR' ? 'workspace.minorHint' : 'workspace.majorHint')}</span>
            </label>
          );
        })}
      </div>
      {major.reason ? <p className="mt-1.5 text-xs text-rose-600">{major.reason}</p>
        : limit && <p className="mt-1.5 text-xs text-slate-500">{t('workspace.revisionsLeft', { remaining: limit.remaining, limit: limit.limit })}</p>}
    </fieldset>
  );
}

/** Tick list shared by the Upload and Save dialogs; ids the backend refused are flagged on their own row. */
function AddressedPicker({ threads, value, onChange, invalid = [] }: { threads: Comment[]; value: string[]; onChange: (ids: string[]) => void; invalid?: string[] }) {
  if (!threads.length) return null;
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{t('upload.addressed')}</legend>
      {threads.map((c) => (
        <label key={c.id} className="mt-1.5 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={value.includes(c.id)} onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))} />
          <span className="min-w-0 break-words">
            {c.content}
            {invalid.includes(c.id) && <span role="alert" className="mt-0.5 block text-xs text-rose-600">{t('workspace.addressedInvalid')}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function UploadDialog({ floors, first, latest, limit, major, wallHeight, threads, onClose, onDone, projectId }: {
  floors: Floor[]; first: boolean; latest: boolean; limit: RevisionLimit | null; major: { ok: boolean; reason?: string }; wallHeight: number;
  threads: Comment[]; projectId: string; onClose: () => void;
  /** addedLevel: the last floor this upload created, to open it next. */
  onDone: (v: DesignVersion, addedLevel: number | null) => void;
}) {
  const [rows, setRows] = useState<UploadRow<File>[]>(() => [...floors].sort((a, b) => a.level - b.level)
    .map((f) => ({ key: f.id, floor_id: f.id, level: f.level, name: f.name, floor_height_mm: f.floor_height_mm, file: null })));
  const [title, setTitle] = useState(first ? t('upload.firstTitle') : '');
  const [revision, setRevision] = useState<RevisionType>('MINOR');
  const [wall, setWall] = useState(wallHeight);
  const patch = (key: string, p: Partial<UploadRow<File>>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const [ticked, setTicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // A missing file is only reported after trying to submit: a new row always starts without one.
  const [tried, setTried] = useState(false);
  const rowErrors = uploadRowErrors(rows);
  const addFloor = () => setRows([...rows, newUploadRow(rows)]);
  const submit = async () => {
    const list = rows.filter((r) => r.file).map((r) => ({ ...r, name: r.name.trim(), file: r.file! }));
    setTried(true);
    setError('');
    if (!title.trim()) return setError(t('upload.errTitle'));
    if (Object.keys(rowErrors).length) return;
    if (!list.length) return setError(t('upload.errNoFile'));
    setBusy(true);
    try {
      const v = await designApi.uploadDxf(projectId, { title: title.trim(), revision_type: first ? null : revision, wall_height_m: wall, files: list, addressed_comment_ids: ticked });
      onDone(v, list.filter((r) => !r.floor_id).at(-1)?.level ?? null);
    } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title={t('upload.title')} size="md" onClose={onClose} footer={<>
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" onClick={submit} loading={busy}>{busy ? t('upload.processing') : t('upload.create')}</Button>
    </>}>
      <div className="space-y-4">
        {!latest && <Banner tone="amber">{t('upload.notLatest')}</Banner>}
        <Field label={t('workspace.titleLabel')}>{(f) => <Input {...f} value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} placeholder={t('upload.titlePlaceholder')} />}</Field>
        {!first && <RevisionPicker value={revision} onChange={setRevision} limit={limit} major={major} />}
        <Field label={t('upload.wallHeight')} className="max-w-[180px]">
          {(f) => <Input {...f} type="number" step={0.1} min={2.2} max={4.5} value={wall} onChange={(e) => setWall(Number(e.target.value))} />}
        </Field>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-end gap-3">
                {r.floor_id ? <p className="min-w-0 flex-1 pb-2 text-sm font-medium text-slate-900">{r.name}</p> : (
                  <Field label={t('upload.floorName')} className="min-w-0 flex-1" error={rowErrors[r.key]?.name ?? rowErrors[r.key]?.level}>{(f) => <Input {...f} value={r.name} maxLength={100} onChange={(e) => patch(r.key, { name: e.target.value })} />}</Field>
                )}
                <Field label={t('upload.floorHeight')} className="w-32" error={rowErrors[r.key]?.height}>
                  {(f) => <Input {...f} type="number" min={2000} max={10000} value={r.floor_height_mm} disabled={!!r.floor_id} onChange={(e) => patch(r.key, { floor_height_mm: Number(e.target.value) })} />}
                </Field>
                {!r.floor_id && (
                  <Button size="sm" variant="ghost" aria-label={t('upload.removeFloor', { name: r.name })} className="mb-0.5" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>×</Button>
                )}
              </div>
              <input type="file" accept=".dxf" aria-label={`DXF ${r.name}`} className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700"
                onChange={(e) => patch(r.key, { file: e.target.files?.[0] ?? null })} />
              {r.floor_id && !r.file && <p className="mt-1 text-xs text-slate-500">{first ? t('upload.noFileFirst') : t('upload.noFileCopy')}</p>}
              {tried && rowErrors[r.key]?.file && <p role="alert" className="mt-1 text-xs text-rose-600">{rowErrors[r.key].file}</p>}
            </div>
          ))}
          <Button block onClick={addFloor}>{t('upload.addFloor')}</Button>
        </div>
        <AddressedPicker threads={threads} value={ticked} onChange={setTicked} />
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

type Dialog =
  | { kind: 'notice'; title: string; body: string; action?: { label: string; run: () => void } }
  | { kind: 'confirm'; title: string; body: string; label: string; run: () => void }
  | { kind: 'request' }
  | { kind: 'save' }
  | { kind: 'assignUnsaved'; roomId: string; roomName: string; designerId: string; designerName: string; n: number };

type RightTab = 'room' | 'item' | 'comments';

/** Underlined tabs for the right column. */
function PanelTabs({ items, value, onChange }: { items: { id: RightTab; label: string; badge?: number }[]; value: RightTab; onChange: (v: RightTab) => void }) {
  const onKey = (e: KeyboardEvent) => {
    const i = items.findIndex((x) => x.id === value);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step) { e.preventDefault(); onChange(items[(i + step + items.length) % items.length].id); }
  };
  return (
    <div role="tablist" aria-label={t('ws.panel')} onKeyDown={onKey} className="flex h-11 shrink-0 items-stretch gap-1 border-b border-line px-2">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} role="tab" type="button" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(it.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on ? 'border-brand text-brand' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            {it.label}
            {!!it.badge && <span className="min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[11px] font-semibold leading-[18px] text-white">{it.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function WorkspacePage() {
  const { projectId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  /** Version on the left of Compare; present in the URL = Compare is on. */
  const compareParam = params.get('compare');
  // replace: flipping Compare should not add steps to the browser's Back
  const setCompareParam = (id: string | null) => setParams((p) => { if (id) p.set('compare', id); else p.delete('compare'); return p; }, { replace: true });
  const viewer = useMemo(() => designApi.getViewer(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [limits, setLimits] = useState<Record<string, RevisionLimit>>({});
  const [version, setVersion] = useState<DesignVersion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  /** A full load has succeeded: later failures keep the screen and show a banner. */
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  const [floorId, setFloorId] = useState('');
  const [tab, setTab] = useState<'2d' | '3d'>('2d');
  const [showFurniture, setShowFurniture] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Selection, comment target, popover, 3D hint and comment mode: all tied to one version and one floor.
  const [canvas, setCanvas] = useState<CanvasUi>(CLEAR_CANVAS);
  const { selEl, selComment, target, quick, hint, commentMode } = canvas;
  const patchCanvas = useCallback((p: Partial<CanvasUi>) => setCanvas((c) => ({ ...c, ...p })), []);
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
  const narrow = useSyncExternalStore(watchNarrow, isNarrow);
  const leftRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);
  const drawerOpener = useRef<HTMLElement | null>(null);
  const openDrawer = (side: 'left' | 'right') => { drawerOpener.current = document.activeElement as HTMLElement | null; setDrawer(side); };
  // Below 1024px: focus moves into an opened drawer and back to the button that opened it.
  useEffect(() => {
    if (!isNarrow()) return;
    if (drawer) (drawer === 'left' ? leftRef : rightRef).current?.focus({ preventScroll: true });
    else { drawerOpener.current?.focus(); drawerOpener.current = null; }
  }, [drawer]);
  const decisionRef = useRef<HTMLElement>(null);
  const [decisionTick, setDecisionTick] = useState(0);
  // After the drawer effect above, so the block is no longer inert when it takes focus.
  useEffect(() => {
    if (!decisionTick) return;
    decisionRef.current?.scrollIntoView({ block: 'nearest' });
    decisionRef.current?.focus({ preventScroll: true });
  }, [decisionTick]);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [nav, setNav] = useState<NavMode>('orbit');
  const [view2d, setView2d] = useState<ViewBox | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  // 3D has no spot pins: an empty click in comment mode shows a hint where the user clicked
  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => patchCanvas({ hint: null }), 3000);
    return () => clearTimeout(id);
  }, [hint, patchCanvas]);
  /** Unsent text in the comment popover: a click elsewhere must not throw it away. */
  const quickHasText = useRef(false);
  const [quickNudge, setQuickNudge] = useState(0);
  useEffect(() => { if (!quick) quickHasText.current = false; }, [quick]);
  const sceneRef = useRef<Scene3DHandle>(null);
  const planRef = useRef<Plan2DHandle>(null);
  const [scene3d, setScene3d] = useState(readScene);
  useEffect(() => {
    try { sessionStorage.setItem(SCENE_KEY, JSON.stringify(scene3d)); } catch { /* private mode: just not remembered */ }
  }, [scene3d]);
  /** Compare the version with the result of Merge & save. Not in the URL: that result is not a version yet. */
  const [mergeCompare, setMergeCompare] = useState(false);
  const keys = useRef({ overlay: false, comparing: false, drawer: false, in3d: false });
  useEffect(() => { keys.current = { overlay: !!(quick || hint), comparing: (!!compareParam || mergeCompare) && tab === '2d', drawer: !!drawer && narrow, in3d: tab === '3d' }; });
  const zoomCanvas = useCallback((k: number) => (keys.current.in3d ? sceneRef.current : planRef.current)?.zoomBy(k), []);
  const fitCanvas = useCallback(() => { if (keys.current.in3d) sceneRef.current?.resetView(); else setView2d(null); }, []);
  // A pinch over the toolbar or a popover must not zoom the page either. Inside the drawing, Plan2D and Scene3D zoom it.
  useEffect(() => {
    const stopPageZoom = (e: WheelEvent) => { if (e.ctrlKey && (e.target as Element | null)?.closest?.('main')) e.preventDefault(); };
    window.addEventListener('wheel', stopPageZoom, { passive: false });
    return () => window.removeEventListener('wheel', stopPageZoom);
  }, []);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const inDialog = !!el?.closest?.('[role="dialog"]') || !!document.querySelector('[aria-modal="true"]');
      if (e.key === 'Escape' && keys.current.drawer && !inDialog) { setDrawer(null); return; }
      if (inDialog || e.ctrlKey || e.metaKey || e.altKey || isTyping(el)) return;
      // only takes effect where the viewer may comment (see `commenting` below)
      if (e.key === 'c' || e.key === 'C') {
        if (keys.current.comparing || keys.current.drawer || quickHasText.current) return;
        setCanvas((c) => ({ ...c, commentMode: !c.commentMode, quick: null, hint: null }));
      } else if (e.key === 'Escape') {
        // Esc closes an open popover or hint first, and only then leaves comment mode
        patchCanvas(keys.current.overlay ? { quick: null, hint: null } : { commentMode: false });
      } else if (!keys.current.drawer) {
        if (e.key === '+' || e.key === '=') zoomCanvas(ZOOM_IN);
        else if (e.key === '-') zoomCanvas(ZOOM_OUT);
        else if (e.key === '0') fitCanvas();
        else if ((e.key === 'h' || e.key === 'H') && keys.current.in3d) setNav('pan');
        else if ((e.key === 'o' || e.key === 'O') && keys.current.in3d) setNav('orbit');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [patchCanvas, zoomCanvas, fitCanvas]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  /** Assignment to make once the Save dialog has saved. */
  const [assignAfterSave, setAssignAfterSave] = useState<{ roomId: string; roomName: string; designerId: string; designerName: string } | null>(null);
  const [stamp, setStamp] = useState('');
  const [draft, setDraft] = useState<Patches>({});
  const projectRole = project ? resolveProjectRole(project, viewer.id) : null;
  const isMember = projectRole === 'MEMBER';
  const work = useRoomWork({ viewerId: viewer.id, projectRole, version, local: draft });
  const { setAssignments, setDrafts, setLatestDrafts, resetForVersion } = work;
  const dirty = isMember ? work.memberDirty : Object.keys(draft).length;
  const shownId = useRef<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('comments');
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [revision, setRevision] = useState<RevisionType>('MINOR');
  const [chooseAll, setChooseAll] = useState(0);
  const [addressed, setAddressed] = useState<string[]>([]);
  const [invalidAddressed, setInvalidAddressed] = useState<string[]>([]);
  const [saveError, setSaveError] = useState('');
  const versionId = params.get('v');

  // Another version: nothing pointed at on the old one survives. Done here, not when clicking, because the blocker may cancel the move.
  const [seenVersionId, setSeenVersionId] = useState(versionId);
  if (seenVersionId !== versionId) {
    setSeenVersionId(versionId);
    setCanvas(CLEAR_CANVAS);
    setDrawer(null);
  }

  // Leaving the version or the page with unsaved work asks first. allowNav lets through the moves the app makes itself.
  const hasDraft = useRef(false);
  useEffect(() => { hasDraft.current = dirty > 0; }, [dirty]);
  const allowNav = useRef(false);
  useEffect(() => { allowNav.current = false; }, [versionId]);
  const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) => {
    if (allowNav.current || !(hasDraft.current || quickHasText.current)) return false;
    return currentLocation.pathname !== nextLocation.pathname
      || new URLSearchParams(currentLocation.search).get('v') !== new URLSearchParams(nextLocation.search).get('v');
  }, []));
  const warnOnUnload = dirty > 0;
  useEffect(() => {
    if (!warnOnUnload) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [warnOnUnload]);

  useEffect(() => () => revokeBlobUrls(), []);

  // Only the newest call may touch state: a slow reload of the old version must not replace the new one.
  const loadSeq = useRef(0);
  /** Floor to open once the version just uploaded is on screen. */
  const pendingFloor = useRef<string | null>(null);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const stale = () => seq !== loadSeq.current;
    try {
      const [p, layout, render, assigned] = await Promise.all([
        designApi.getProject(projectId), designApi.listVersions(projectId, 'LAYOUT_2D'), designApi.listVersions(projectId, 'RENDER_3D'),
        projectApi.listRoomAssignments(projectId),
      ]);
      if (stale()) return;
      setProject(p);
      setAssignments(assigned);
      setStamp(formatTime(new Date().toISOString()));
      setLimits({ LAYOUT_2D: layout.revisionLimit, RENDER_3D: render.revisionLimit });
      const all = [...layout.items, ...render.items].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setVersions(all);
      const id = all.find((v) => v.id === versionId)?.id ?? (latestVersion(render.items) ?? latestVersion(layout.items))?.id;
      if (!id) { shownId.current = 'none'; setVersion(null); setDrafts([]); setLatestDrafts([]); setError(''); setReady(true); return; }
      // Only the design team has drafts, and only at the Products stage.
      const hasDrafts = viewer.role === 'designer' && all.find((x) => x.id === id)?.version_type === 'RENDER_3D';
      const shownSummary = all.find((x) => x.id === id)!;
      // a Member left on an older version still has to hear about changes dropped from their draft
      const newest = resolveProjectRole(p, viewer.id) === 'MEMBER' ? olderVersionDraftSource(render.items, shownSummary) : null;
      const none = Promise.resolve<RoomDraft[]>([]);
      const [v, cs, roomDrafts, newestDrafts] = await Promise.all([designApi.getVersion(id), designApi.listComments(id), hasDrafts ? designApi.listRoomDrafts(id) : none, newest ? designApi.listRoomDrafts(newest) : none]);
      if (stale()) return;
      setComments(cs);
      setDrafts(roomDrafts);
      setLatestDrafts(newestDrafts);
      if (shownId.current !== v.id) {
        shownId.current = v.id;
        setTab(v.version_type === 'RENDER_3D' ? '3d' : '2d');
        setRightTab(v.version_type === 'RENDER_3D' && viewer.role === 'designer' ? 'item' : 'comments');
        const opened = v.floors.find((x) => x.id === pendingFloor.current)?.id;
        pendingFloor.current = null;
        setFloorId((f) => opened ?? (v.floors.some((x) => x.id === f) ? f : [...v.floors].sort((a, b) => a.level - b.level)[0]?.id ?? ''));
        setCanvas(CLEAR_CANVAS); setDraft({}); resetForVersion(); setMergeCompare(false); setRoomKey(null); setView2d(null);
      }
      setVersion(v);
      setError('');
      setReady(true);
    } catch (e) { if (!stale()) setError(errorText(e)); } finally { if (!stale()) setLoaded(true); }
  }, [projectId, versionId, viewer.role, viewer.id, setAssignments, setDrafts, setLatestDrafts, resetForVersion]);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const compareOptions = useMemo(() => (version ? compareCandidates(versions, version, floorId) : []), [versions, version, floorId]);
  const compareTarget = version ? pickCompareTarget(compareOptions, version, compareParam) : null;
  // Keep the URL honest once the page has settled: a version that is no longer valid gives way to the one just before,
  // and with nothing left to compare the switch goes off.
  const settled = ready && !!version && (!versionId || version.id === versionId);
  const validCompare = compareTarget?.id ?? null;
  useEffect(() => {
    if (settled && compareParam && compareParam !== validCompare) setCompareParam(validCompare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, compareParam, validCompare]);

  const labels = useMemo(() => Object.fromEntries(versions.map((v) => [v.id, versionLabel(v.label, viewer.role)])), [versions, viewer.role]);
  const threads = useMemo(() => (version ? commentThreads(comments, version) : []), [comments, version]);
  const openThreads = threads.filter((x) => x.root.status === 'OPEN');
  // the viewer's unsaved changes, a Member's saved drafts, or the draft the Lead is previewing
  const elements = useMemo(() => withPatches(version?.elements ?? [], work.patches), [version, work.patches]);
  const floorEls = useMemo(() => elements.filter((e) => e.floor_id === floorId), [elements, floorId]);
  const floor = version?.floors.find((f) => f.id === floorId);
  const rooms = useMemo(() => (floor ? floorRooms(floor.scene_json) : []), [floor]);
  const room = rooms.find((r) => r.key === roomKey) ?? null;

  if (error && !ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-xl space-y-3">
          <ErrorState message={error} onRetry={() => { setError(''); setLoaded(false); load(); }} />
          <Link to={projectsHome(viewer.role)} className="rounded text-sm font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{t('common.back')}</Link>
        </div>
      </div>
    );
  }
  if (!loaded || !project) {
    return (
      <div className="grid h-dvh grid-rows-[56px_minmax(0,1fr)] bg-canvas">
        <div className="border-b border-line bg-surface" />
        <div className="grid min-h-0 grid-cols-1 gap-px lg:grid-cols-[240px_minmax(0,1fr)_340px]">
          <Skeleton className="hidden h-full rounded-none lg:block" /><Skeleton className="h-full rounded-none bg-stage" /><Skeleton className="hidden h-full rounded-none lg:block" />
        </div>
      </div>
    );
  }

  const ctx = {
    role: viewer.role, version, project, projectRole, assignedRoomIds: work.assignedRoomIds, openCount: openThreads.length,
    unknownCount: elements.filter(isUnknownItem).length, notChosenCount: elements.filter(isNotChosenItem).length,
    revisionsLeft: version ? limits[version.version_type]?.remaining : undefined,
  };
  const allow = (a: Action, roomId?: string | null) => {
    if (roomId === undefined) return can(a, ctx);
    const owner = roomId ? work.ownerOf.get(roomId) : undefined;
    return can(a, { ...ctx, roomId, roomOwnedByOther: !!owner && owner.designerId !== viewer.id });
  };
  // a homeowner also has to answer what the designer marked addressed
  const commentBadge = threads.filter((x) => x.root.status === 'OPEN' || (viewer.role === 'homeowner' && x.root.status === 'ADDRESSED')).length;
  const canExport = allow('exportFiles').ok;
  const canComment = allow('comment').ok;
  const commenting = commentMode && canComment;
  const previewing = !!work.previewDraft;
  const leadEditing = allow('editItems').ok;
  const reviewing = allow('reviewDrafts').ok;
  const memberDrafting = allow('saveRoomDraft').ok;
  const latest = versions[0];
  const current = versions.find((v) => v.id === version?.id) ?? null;
  const layoutVersions = versions.filter((v) => v.version_type === 'LAYOUT_2D');
  const canFirstUpload = allow('uploadFirst').ok && !layoutVersions.length;
  const isRender = version?.version_type === 'RENDER_3D';
  const readOnly = !!version && (version.status === 'SUPERSEDED' || version.status === 'APPROVED' || project.status === 'COMPLETED' || project.status === 'CANCELLED');
  const goVersion = (id: string) => setParams((p) => { p.set('v', id); return p; });
  /** For moves the app makes itself after saving or approving: nothing is left to protect. */
  const goVersionNow = (id: string) => { allowNav.current = true; goVersion(id); };
  const apartmentFloors: Floor[] = (project.apartment.floors ?? []).map((f) => ({ id: f.id, level: f.level, name: f.name, floor_height_mm: f.floorHeightMm }));
  const backTo = viewer.role === 'designer' ? '/designer/projects' : viewer.role === 'homeowner' ? '/homeowner/projects' : `/staff/projects/${project.id}`;

  // compare: default to the version just before the one being viewed, same stage
  const compareOn = !!compareParam && tab === '2d' && !!compareTarget && !mergeCompare;
  const mergeCompareOn = mergeCompare && tab === '2d';

  const threadFloor = (x: CommentThread) => x.element?.floor_id ?? x.root.floor_id;
  const threadRoom = (x: CommentThread) => {
    const byId = x.root.room_id ? rooms.find((r) => r.room_id === x.root.room_id) : undefined;
    if (byId) return byId.key;
    const p = pinPoint(x);
    return p && threadFloor(x) === floorId ? roomAt(rooms, p) : null;
  };
  const floorCounts = openThreads.reduce<Record<string, number>>((m, x) => ({ ...m, [x.root.floor_id ?? '']: (m[x.root.floor_id ?? ''] ?? 0) + 1 }), {});
  const roomCounts = openThreads.reduce<Record<string, number>>((m, x) => { const k = threadRoom(x); return k ? { ...m, [k]: (m[k] ?? 0) + 1 } : m; }, {});
  const roomItems = room ? floorEls.filter((e) => elementRoom(rooms, e) === room.key) : floorEls;
  const layers: Layers = { interior: true, furniture: showFurniture, wallItems: showFurniture, lights: showFurniture };

  const pins: Pin[] = pinsToShow(threads, selComment)
    .filter((x) => threadFloor(x) === floorId)
    .flatMap((x): Pin[] => { const p = pinPoint(x); return p ? [{ id: x.root.id, num: x.num!, ...p, resolved: x.root.status === 'RESOLVED', active: x.root.id === selComment }] : []; })
    // temporary pin where the user clicked, while the comment is being written
    .concat(quick?.target.kind === 'point' && quick.target.floor_id === floorId ? [{ id: 'quick-pin', num: null, x: quick.target.x, y: quick.target.y, resolved: false, active: true }] : []);
  const selThread = threads.find((x) => x.root.id === selComment);
  const selPoint = selThread && pinPoint(selThread);
  const focus = selThread && selPoint && threadFloor(selThread) === floorId ? { key: `${selThread.root.id}-${floorId}`, ...selPoint } : null;
  const selElement = elements.find((e) => e.id === selEl) ?? null;
  const editable = !previewing && !!selElement && allow('editItem', selElement.room_id).ok;
  const ownerOfRoom = (roomId: string | null | undefined) => (roomId ? work.ownerOf.get(roomId) : undefined);
  const itemOwner = ownerOfRoom(selElement?.room_id);
  const roomOwner = ownerOfRoom(room?.room_id);
  const itemNote = !selElement ? undefined
    : itemOwner ? (itemOwner.designerId === viewer.id ? t('team.assignedToYou') : t('team.assignedTo', { name: itemOwner.designerName }))
    : memberDrafting && !editable ? t('team.notYourRoom') : undefined;
  // Only outlines from the current floor; a room with no outline cannot be shaded.
  const dimmed = memberDrafting ? rooms.flatMap((r) => (r.boundary && !allow('editItem', r.room_id).ok ? [r.boundary] : [])) : [];
  const team = [...(project.designer ? [{ id: project.designer.id, name: project.designer.fullName }] : []), ...(project.members ?? []).map((m) => ({ id: m.designerId, name: m.fullName }))];
  const avatars = avatarLabels(team);
  const droppedNames = isMember ? droppedItemNames([...work.drafts, ...work.latestDrafts], version?.elements ?? []) : [];
  const newestRender = latestVersion(versions.filter((v) => v.version_type === 'RENDER_3D'));
  const baseElements = version?.elements ?? [];
  const leadCount = Object.keys(work.leadWork).length;
  const summary = reviewing ? mergeSummary(baseElements, work.readyDrafts, work.leadWork) : null;
  const mergeChange = mergeCompareOn && selElement ? summary?.lines.find((l) => l.elementId === selElement.id) : undefined;
  const canTakeOver = (roomId: string | null | undefined) => !!roomId && allow('takeOverRoom', roomId).ok;
  // The Comments composer follows the selected item unless the user picked a spot or switched to a general comment (✕).
  const composeTarget: CommentTarget | null = target ?? (selElement ? { kind: 'element', element: selElement } : null);

  /** Unsent popover text wins over a click elsewhere: keep the popover, ignore the click, put the cursor back. */
  const holdQuick = () => {
    if (!quick || !quickHasText.current) return false;
    setQuickNudge((n) => n + 1);
    return true;
  };
  /** Clears the canvas selection, so callers that jump to an item on another floor select it after this. */
  const changeFloor = (id: string) => {
    if (id === floorId || holdQuick()) return;
    setFloorId(id); setRoomKey(null); setView2d(null); setCanvas(CLEAR_CANVAS);
  };
  const pickRoom = (key: string | null) => {
    setRoomKey(key);
    const r = rooms.find((x) => x.key === key);
    if (!r) return;
    setView2d(roomView(r));
    setRightTab('room');
  };
  const roomCenter = (): [number, number] | null => {
    if (!room) return null;
    if (!room.boundary) return room.label;
    const b = boxOf(room.boundary);
    return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  };

  /** Popover anchor: click position relative to the canvas. */
  const anchor = (at: ClickPoint) => {
    const r = mainRef.current?.getBoundingClientRect();
    return { x: at.clientX - (r?.left ?? 0), y: at.clientY - (r?.top ?? 0), w: r?.width ?? 0, h: r?.height ?? 0 };
  };
  const clickElement = (e: DesignElement | null, at?: ClickPoint) => {
    if (holdQuick()) return;
    if (e && e.floor_id !== floorId) changeFloor(e.floor_id);
    patchCanvas({ selEl: e?.id ?? null, selComment: null });
    if (commenting && e && at) { patchCanvas({ hint: null, quick: { target: { kind: 'element', element: e }, ...anchor(at) } }); return; }
    if (commenting && !e && at && tab === '3d') { patchCanvas({ quick: null, hint: anchor(at) }); return; }
    // a new selection re-attaches the Comments composer to the selected item
    patchCanvas({ quick: null, hint: null, target: null });
    if (!e) return;
    if (isRender) { setRightTab('item'); setDrawer('right'); }
    else if (canComment) { setRightTab('comments'); patchCanvas({ target: { kind: 'element', element: e } }); setDrawer('right'); }
  };
  /** Only reached in comment mode: elsewhere an empty click just clears the selection. */
  const clickSpot = (p: { x: number; y: number }, at: ClickPoint) => {
    if (holdQuick()) return;
    patchCanvas({ selEl: null, quick: { target: { kind: 'point', ...p, floor_id: floorId }, ...anchor(at) } });
  };
  const toggleCommentMode = () => { if (!holdQuick()) patchCanvas({ commentMode: !commentMode, quick: null, hint: null }); };
  /** Turns Compare on, or changes the version while on; zoom and pan stay. Compare and comment mode exclude each other. */
  const startCompare = (id: string) => {
    if (holdQuick()) return;
    patchCanvas({ commentMode: false, quick: null, hint: null });
    setTab('2d');
    setMergeCompare(false);
    setCompareParam(id);
  };
  /** Back to the single drawing, framed like Fit, or on the selected room. */
  const stopCompare = () => {
    setCompareParam(null);
    setView2d(room ? roomView(room) : null);
  };
  const compareOption = (v: VersionSummary) => ({ id: v.id, label: versionLabel(v.label, viewer.role), status: v.status });
  /** Backend wording for unknown blocks names AutoCAD and block codes, which only the designer should read. */
  const messageOf = (e: unknown) => (viewer.role !== 'designer' && (e as { code?: string }).code === 'UNKNOWN_BLOCKS' ? `${t('reasons.unknownCustomer')}.` : errorText(e));
  /** The page was out of date: open the version the backend says is current, or refresh if it named none. */
  const viewCurrent = (id?: string | null) => {
    if (id && id !== version?.id) goVersion(id);
    else loadRef.current();
  };
  const isStale = (e: unknown) => ['INVALID_ADDRESSED_VERSION', 'VERSION_NOT_CURRENT'].includes((e as { code?: string }).code ?? '');
  const staleNotice = (e: unknown): Dialog => {
    const current = (e as { details?: { currentVersionId?: string | null } }).details?.currentVersionId;
    return { kind: 'notice', title: t('workspace.errorTitle'), body: errorText(e), action: { label: t('workspace.viewLatest'), run: () => viewCurrent(current) } };
  };
  /**
   * One designer per room, and someone just moved a room or a draft under this page. Changes the backend will never accept
   * are removed, or every later Save would fail the same way; the message says so.
   */
  const roomConflict = (e: unknown) => {
    const err = e as { code?: string; details?: { roomIds?: string[]; elementIds?: string[] } };
    if (err.code !== 'ROOM_ASSIGNED_TO_MEMBER' && err.code !== 'ROOM_DRAFT_CONFLICT') return false;
    const rooms = err.details?.roomIds ?? [], items = err.details?.elementIds ?? [];
    setDraft((d) => Object.fromEntries(Object.entries(d).filter(([id]) => {
      const roomId = version?.elements.find((x) => x.id === id)?.room_id;
      return !items.includes(id) && !(roomId && rooms.includes(roomId));
    })));
    setDialog({ kind: 'notice', title: t('workspace.errorTitle'), body: errorText(e) });
    loadRef.current();
    return true;
  };
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    // loadRef: fn may have moved to another version, and this closure's load would still fetch the old one
    try { await fn(); await loadRef.current(); return true; } catch (e) {
      // Offline: keep the screen and whatever was typed. With a dialog open the banner would be hidden behind it.
      if (isNetworkError(e) && !dialog) setError(errorText(e));
      else if (roomConflict(e)) return false;
      else if (isStale(e)) setDialog(staleNotice(e));
      else setDialog({ kind: 'notice', title: t('workspace.errorTitle'), body: messageOf(e) });
      return false;
    } finally { setBusy(false); }
  };
  /** Same API for the Comments composer and the quick popover. */
  const postComment = async (tg: CommentTarget, content: string) => {
    if (!targetInVersion(tg, elements)) {
      setDialog({ kind: 'notice', title: t('workspace.errorTitle'), body: t('workspace.targetGone') });
      return false;
    }
    return run(() => designApi.createComment(version!.id, {
      content, floor_id: tg.kind === 'general' ? null : tg.kind === 'element' ? tg.element.floor_id : tg.floor_id,
      design_element_id: tg.kind === 'element' ? tg.element.id : null,
      pin_position: tg.kind === 'point' ? { x: tg.x, y: tg.y } : null,
    }));
  };
  const approve = (layout: boolean) => run(async () => {
    await designApi.approve(version!.id);
    setNotice(t(layout ? 'workspace.layoutApproved' : 'workspace.productsApproved'));
    if (layout) {
      const render = await designApi.listVersions(projectId, 'RENDER_3D');
      const next = latestVersion(render.items);
      if (next) goVersionNow(next.id);
    }
  });
  const openSave = (title: string, remaining: number, assignAfter: typeof assignAfterSave = null) => {
    work.setPreviewId(null);
    setAssignAfterSave(assignAfter);
    setText(title); setRevision('MINOR'); setChooseAll(remaining); setInvalidAddressed([]); setSaveError('');
    const openIds = openThreads.map((x) => x.root.id);
    setAddressed([...new Set([...suggestedAddressed(work.drafts, openIds), ...work.ownDrafts.flatMap((d) => d.addressed_comment_ids).filter((id) => openIds.includes(id))])]);
    setDialog({ kind: 'save' });
  };
  const saveDraft = async () => {
    setBusy(true);
    setInvalidAddressed([]);
    setSaveError('');
    try {
      const own = foldOwnDrafts(version!.elements, work.ownDrafts, draft);
      const edits = Object.entries(own.direct).map(([id, p]) => {
        const original = version!.elements.find((e) => e.id === id);
        return {
          element_id: id,
          product_id: p.product && p.product.id !== original?.product?.id ? p.product.id : undefined,
          overrides: p.overrides ?? undefined,
        };
      }).filter((e) => e.product_id || e.overrides);
      // a taken-over draft goes back to DRAFT, and only Ready drafts can be merged
      for (const r of own.rooms) {
        if (r.changed) await designApi.saveRoomDraft(version!.id, r.draft.room_id, r.input);
        if (r.count && (r.changed || r.draft.status !== 'READY')) await designApi.markRoomDraftReady(version!.id, r.draft.room_id);
      }
      const v = await designApi.saveEdits(version!.id, { title: text.trim(), revision_type: revision, edits, choose_all_remaining: chooseAll > 0, addressed_comment_ids: addressed, room_draft_ids: [...work.readyDrafts, ...own.rooms.filter((r) => r.count).map((r) => r.draft)].map((d) => d.id) });
      const skipped = skippedRoomNames(v.skipped_room_ids, version!.floors);
      if (skipped.length) setNotice(t('workspace.skippedRooms', { rooms: skipped.join(', ') }));
      setDraft({});
      setDialog(null);
      if (assignAfterSave) {
        // the version is saved either way: a failed assignment must not hide it
        try { await projectApi.updateRoomAssignments(project.id, [{ roomId: assignAfterSave.roomId, designerId: assignAfterSave.designerId }]); } catch (err) { setDialog({ kind: 'notice', title: t('workspace.errorTitle'), body: errorText(err) }); }
      }
      goVersionNow(v.id);
    } catch (e) {
      const noChange = e as { code?: string; details?: { skippedRoomIds?: string[] } };
      if (noChange.code === 'NO_CHANGES' && noChange.details?.skippedRoomIds?.length) {
        // nothing was left to choose outside the Members' rooms
        setDialog(null);
        setNotice(t('workspace.skippedRooms', { rooms: skippedRoomNames(noChange.details.skippedRoomIds, version!.floors).join(', ') }));
        return;
      }
      if (roomConflict(e)) return;
      if (isStale(e)) { setDialog(staleNotice(e)); return; }
      // The dialog stays open with everything typed; the backend names the refused ticks.
      const err = e as { code?: string; details?: { invalidCommentIds?: string[] } };
      if (err.code === 'INVALID_ADDRESSED_COMMENTS') setInvalidAddressed(err.details?.invalidCommentIds ?? []);
      setSaveError(errorText(e));
    } finally { setBusy(false); }
  };
  const patchSelected = (patch: Partial<DesignElement>) => selEl && setDraft((d) => ({ ...d, [selEl]: { ...d[selEl], ...patch } }));

  /** Cleared after the reload, so the canvas never falls back to the old draft in between. */
  const clearRoomLocal = (roomId: string) => {
    setDraft((d) => Object.fromEntries(Object.entries(d).filter(([id]) => version?.elements.find((e) => e.id === id)?.room_id !== roomId)));
    work.clearRoomTicks(roomId);
  };
  const saveMemberDraft = async (r: MemberDraftRow) => {
    if (await run(() => designApi.saveRoomDraft(version!.id, r.roomId, r.input))) clearRoomLocal(r.roomId);
  };
  const markMemberReady = async (r: MemberDraftRow) => {
    const ok = await run(async () => {
      if (r.dirty) await designApi.saveRoomDraft(version!.id, r.roomId, r.input);
      await designApi.markRoomDraftReady(version!.id, r.roomId);
    });
    if (ok) clearRoomLocal(r.roomId);
  };
  const assignRoom = (roomId: string, designerId: string | null) => {
    const go = () => { run(() => projectApi.updateRoomAssignments(project.id, [{ roomId, designerId }])); };
    if (designerId === viewer.id && canTakeOver(roomId)) { takeOverRoom(roomId); return; }
    const unsaved = localChangesInRoom(baseElements, roomId, draft);
    if (designerId && designerId !== viewer.id && unsaved) {
      const roomName = version?.floors.flatMap((f) => f.scene_json.rooms).find((r) => r.room_id === roomId)?.name ?? '';
      setDialog({ kind: 'assignUnsaved', roomId, roomName, designerId, designerName: team.find((x) => x.id === designerId)?.name ?? '', n: unsaved });
      return;
    }
    // the backend deletes the room's draft when it goes to anyone but the Lead
    if (work.drafts.some((d) => d.room_id === roomId && changeCount(d) > 0)) setDialog({ kind: 'confirm', title: t('team.reassignTitle'), body: t('team.reassignBody'), label: t('team.reassign'), run: go });
    else go();
  };
  const ownerMenu = (roomId: string, roomName: string, variant?: 'avatar' | 'link') => {
    const owner = ownerOfRoom(roomId);
    return <RoomOwnerMenu roomName={roomName} ownerId={owner?.designerId ?? null} ownerName={owner?.designerName ?? null} team={team} avatars={avatars} editable={allow('assignRooms').ok} onPick={(id) => assignRoom(roomId, id)} variant={variant} />;
  };
  /** Giving a room to the Lead moves its draft to the Lead on the backend; it then counts as the Lead's own changes. */
  const takeOverRoom = (roomId: string) => {
    const owner = ownerOfRoom(roomId);
    if (!owner) return;
    setDialog({
      kind: 'confirm', title: t('team.takeOver'), body: t('team.takeOverBody', { name: owner.designerName }), label: t('team.takeOver'),
      run: () => { run(() => projectApi.updateRoomAssignments(project.id, [{ roomId, designerId: viewer.id }])); },
    });
  };
  const discardLeadWork = () => {
    const own = work.ownDrafts;
    if (!own.length) { setDraft({}); return; }
    // saved on the server, so this cannot be undone
    setDialog({
      kind: 'confirm', title: t('drafts.discardOwnTitle'), body: t('drafts.discardOwnBody'), label: t('items.discard'),
      run: () => {
        setDraft({});
        run(async () => { for (const d of own) await designApi.saveRoomDraft(version!.id, d.room_id, { selections: [], overrides: [], addressed_comment_ids: [] }); });
      },
    });
  };
  const focusLine = (l: ChangeLine) => {
    if (holdQuick()) return;
    if (l.floorId !== floorId) changeFloor(l.floorId);
    patchCanvas({ selEl: l.elementId, selComment: null, quick: null, hint: null, target: null });
    setRightTab('item');
    setView2d({ x: l.position.x - 1.5, y: -l.position.y - 1.5, w: 3, h: 3 });
    // after the floor change above has been drawn
    requestAnimationFrame(() => sceneRef.current?.focusAt(l.position.x, l.position.y));
  };
  const toggleMergeCompare = () => {
    if (mergeCompare) { setMergeCompare(false); setView2d(room ? roomView(room) : null); return; }
    if (holdQuick()) return;
    work.setPreviewId(null);
    patchCanvas({ commentMode: false, quick: null, hint: null });
    if (compareParam) setCompareParam(null);
    setTab('2d');
    setMergeCompare(true);
  };
  const togglePreview = (d: RoomDraft) => {
    if (work.previewId === d.id) { work.setPreviewId(null); return; }
    setMergeCompare(false);
    work.setPreviewId(d.id);
    for (const f of version?.floors ?? []) {
      const r = floorRooms(f.scene_json).find((x) => x.room_id === d.room_id);
      if (!r) continue;
      if (f.id !== floorId) changeFloor(f.id);
      setRoomKey(r.key);
      setView2d(roomView(r));
      break;
    }
  };

  // primary action in the bar: designer uploads (Layout), homeowner goes to the decision block
  const approveAction = version ? (version.version_type === 'LAYOUT_2D' ? 'approveLayout' : 'approveProducts') as 'approveLayout' | 'approveProducts' : null;
  const approveState = approveAction ? allow(approveAction) : { ok: false };
  const requestState = allow('requestChanges');
  const approveVisible = approveState.ok || !!approveState.reason;
  const requestVisible = requestState.ok || !!requestState.reason;
  const blockers = approveAction && ctx && approveState.reason ? approveBlockers(approveAction, ctx) : [];
  const roundLimit = version ? limits[version.version_type] : undefined;
  const noRoundsLeft = viewer.role === 'homeowner' && approveVisible && roundLimit?.remaining === 0;
  const askApprove = () => {
    const layout = approveAction === 'approveLayout';
    const body = t(layout ? 'workspace.confirmLayoutBody' : 'workspace.confirmProductsBody');
    setDialog({
      kind: 'confirm',
      title: t(layout ? 'workspace.confirmLayout' : 'workspace.confirmProducts', { label: versionLabel(version!.label, viewer.role) }),
      body: version!.status === 'SUPERSEDED' ? `${body} ${t('workspace.approveOldNote')}` : body,
      label: t('workspace.approve'), run: () => approve(layout),
    });
  };
  const goToDecision = () => {
    if (isNarrow()) openDrawer('right');
    setDecisionTick((n) => n + 1);
  };
  const primary = (allow('upload').ok || canFirstUpload) ? (
    <Button size="sm" variant="primary" onClick={() => setUploading(true)}><Upload aria-hidden className="h-4 w-4" />{t('workspace.uploadDxf')}</Button>
  ) : approveVisible && version ? (
    // below 1024px the reasons are in a drawer, so a blocked button still leads to them
    <Button size="sm" variant="primary" disabled={!approveState.ok && !narrow} title={approveState.reason} onClick={approveState.ok ? askApprove : goToDecision}>
      {t('ws.approveLabel', { label: versionLabel(version.label, viewer.role) })}
    </Button>
  ) : null;

  const downloadDxf = canExport && floor && version ? {
    label: version.floors.length > 1 ? t('workspace.downloadDxfFloor', { floor: floor.name }) : t('workspace.downloadDxf'),
    run: () => downloadFile(floor.file_url, `${version.label}-${floor.name}.dxf`).catch((e) => setDialog({ kind: 'notice', title: t('workspace.downloadError'), body: errorText(e) })),
  } : null;

  const canvasMenu = tab === '3d' && canExport ? [
    { label: t('scene.glb'), icon: <Box aria-hidden className="h-4 w-4 text-slate-500" />, run: () => sceneRef.current?.exportGlb() },
    { label: t('scene.png'), icon: <ImageIcon aria-hidden className="h-4 w-4 text-slate-500" />, run: () => sceneRef.current?.savePng() },
  ] : [];

  const drawerCls = (side: 'left' | 'right') =>
    `fixed inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} ${Z.drawer} min-h-0 bg-surface shadow-float outline-none transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${drawer === side ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'}`;
  const cols = leftCollapsed
    ? 'lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]'
    : 'lg:grid-cols-[220px_minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_340px]';

  const tabs: { id: RightTab; label: string; badge?: number }[] = [
    { id: 'room', label: t('ws.tabRoom') },
    ...(isRender ? [{ id: 'item' as const, label: t('ws.tabItem') }] : []),
    { id: 'comments', label: t('workspace.comments'), badge: commentBadge },
  ];
  const activeTab = tabs.some((x) => x.id === rightTab) ? rightTab : 'comments';
  const showDecision = viewer.role === 'homeowner' && (requestVisible || !!blockers.length || noRoundsLeft);

  return (
    <div className="grid h-dvh grid-rows-[56px_minmax(0,1fr)] overflow-hidden bg-canvas font-sans text-slate-900">
      <WorkspaceBar role={viewer.role} backTo={backTo} title={project.title} stage={version?.version_type ?? null}
        versions={versions} current={current} onVersion={goVersion}
        canCompare={(v) => compareOptions.some((o) => o.id === v.id)}
        onCompare={startCompare}
        download={downloadDxf} step={STEP_OF[project.status] ?? 0} primary={primary}
        secondary={<Button size="sm" onClick={() => setInfoOpen(true)}><Info aria-hidden className="h-4 w-4" /><span className="hidden md:inline">{t('ws.projectInfo')}</span></Button>}
        onOpenLeft={() => openDrawer('left')} onOpenRight={() => openDrawer('right')} openComments={commentBadge} />

      <div className={`relative grid min-h-0 grid-cols-1 ${cols}`}>
        {drawer && <div className={`fixed inset-0 ${Z.drawerBackdrop} bg-slate-900/30 lg:hidden`} onClick={() => setDrawer(null)} />}

        {/* left: floors → rooms */}
        <aside ref={leftRef} tabIndex={-1} inert={narrow && drawer !== 'left'} aria-label={t('ws.floorsRooms')} className={`${drawerCls('left')} w-[85vw] max-w-[280px] border-r border-line lg:w-auto lg:max-w-none ${leftCollapsed ? 'lg:hidden' : ''}`}>
          {version && floor ? (
            <FloorRoomTree floors={version.floors} floorId={floorId} onFloor={changeFloor} rooms={rooms} roomKey={roomKey}
              onRoom={(k) => { pickRoom(k); setDrawer(null); }} floorCounts={floorCounts} roomCounts={roomCounts}
              showFurniture={showFurniture} onShowFurniture={setShowFurniture} onCollapse={() => setLeftCollapsed(true)}
              roomMeta={viewer.role === 'designer' ? (r) => (!r.has_name && !r.room_id ? <span className="block truncate text-[11px] font-normal text-slate-500">{t('team.unnamed')}</span> : null) : undefined}
              roomAction={viewer.role === 'designer' ? (r) => (r.room_id ? ownerMenu(r.room_id, r.name) : null) : undefined} />
          ) : <p className="p-4 text-sm text-slate-500">{t('workspace.noVersions')}</p>}
        </aside>

        {/* centre: drawing, edge to edge */}
        <main ref={mainRef} className={`relative min-h-0 min-w-0 bg-stage ${commenting ? 'comment-mode' : ''}`}>
          <div className={`pointer-events-none absolute inset-x-3 top-14 ${Z.canvasBanner} mx-auto flex max-w-xl flex-col gap-2`}>
            {error && (
              <div role="alert" className="pointer-events-auto">
                <Banner tone="amber" action={<Button size="sm" onClick={() => { setError(''); load(); }}>{t('common.retry')}</Button>}>{error}</Banner>
              </div>
            )}
            <div role="status" aria-live="polite" className="pointer-events-auto">{notice && <Banner>{notice}</Banner>}</div>
            {!!droppedNames.length && (
              <div className="pointer-events-auto">
                <Banner tone="amber" action={work.latestDrafts.length && newestRender && newestRender.id !== version?.id ? <Button size="sm" onClick={() => goVersion(newestRender.id)}>{t('workspace.viewLatest')}</Button> : undefined}>
                  {t('drafts.dropped', { n: droppedNames.length })}
                  <span className="mt-0.5 block text-xs">{droppedNames.join(', ')}</span>
                </Banner>
              </div>
            )}
          </div>
          {!version || !floor ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-sm">
                <p className="text-[15px] font-semibold text-slate-900">{t('workspace.noDrawing')}</p>
                <p className="mt-1 text-sm text-slate-600">{canFirstUpload ? t('workspace.uploadFirst') : t('workspace.waitingDesigner')}</p>
                {canFirstUpload && <Button variant="primary" className="mt-4" onClick={() => setUploading(true)}>{t('workspace.uploadDxf')}</Button>}
              </div>
            </div>
          ) : (
            <>
              <div className="ws-drawing absolute inset-0">
                {mergeCompareOn && summary ? (
                  <ComparePanel planRef={planRef} role={viewer.role} fromId={version.id} toId={version.id} floorId={floorId} layers={layers} view={view2d} onViewChange={setView2d}
                    merge={{
                      base: version, elements: withPatches(baseElements, mergePatches(draftPatches(work.readyDrafts), work.leadWork)), lines: summary.lines, selectedId: selEl,
                      onPick: (id) => { patchCanvas({ selEl: id, selComment: null }); setRightTab('item'); setDrawer('right'); },
                    }} />
                ) : compareOn && compareTarget ? (
                  <ComparePanel planRef={planRef} role={viewer.role} fromId={compareTarget.id} toId={version.id} floorId={floorId} layers={layers} view={view2d} onViewChange={setView2d} />
                ) : tab === '3d' ? (
                  <LazyScene3D ref={sceneRef} floors={version.floors} elements={showFurniture ? elements : NO_ELEMENTS} floorId={floorId} selectedId={selEl} onPick={clickElement}
                    fileName={`${project.code} ${version.label}`} navMode={nav} lights={scene3d.lights} ceiling={scene3d.ceiling}
                    room={room ? { key: room.key, center: roomCenter()!, boundary: room.boundary } : null} dimmed={dimmed}
                    onExportError={() => setDialog({ kind: 'notice', title: t('workspace.errorTitle'), body: t('scene.glbFailed') })} />
                ) : (
                  <Plan2D ref={planRef} floor={floor} elements={floorEls} layers={layers} selectedId={selEl} onSelect={clickElement} pins={pins}
                    onPinClick={(id) => { patchCanvas({ selComment: id }); setRightTab('comments'); setDrawer('right'); }} focus={focus}
                    room={room?.boundary} dimmed={dimmed} highlight={previewHighlight(work.previewDraft)} view={view2d} onViewChange={setView2d}
                    onEmptyClick={commenting ? clickSpot : undefined} />
                )}
              </div>

              <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-wrap content-around justify-around overflow-hidden opacity-[0.07]">
                {Array.from({ length: 6 }, (_, i) => <span key={i} className="-rotate-12 text-sm font-semibold">{viewer.email} {stamp}</span>)}
              </div>

              {hint && (
                <CommentHint x={hint.x} y={hint.y} bounds={{ width: hint.w, height: hint.h }}
                  onSwitch2D={() => { patchCanvas({ hint: null }); setTab('2d'); }} />
              )}
              {quick && (
                <QuickComment key={`${quick.x},${quick.y}`} x={quick.x} y={quick.y}
                  bounds={{ width: quick.w, height: quick.h }} nudge={quickNudge} placeholder={commentPlaceholder(quick.target, isRender)}
                  title={quick.target.kind === 'element' ? t('comments.forItem', { name: elementName(quick.target.element, viewer.role) }) : t('ws.commentAtSpot')}
                  onTextChange={(has) => { quickHasText.current = has; }}
                  onCancel={() => patchCanvas({ quick: null })}
                  onSend={async (content) => { const ok = await postComment(quick.target, content); if (ok) patchCanvas({ quick: null }); return ok; }} />
              )}

              {/* top overlays */}
              <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start gap-2">
                {leftCollapsed && (
                  <button type="button" onClick={() => setLeftCollapsed(false)} aria-label={t('ws.expand')} title={t('ws.expand')}
                    className="pointer-events-auto hidden h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-slate-700 shadow-float hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand lg:flex">
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                )}
                {floor.scene_json.warnings.length > 0 && viewer.role === 'designer' && tab === '2d' && !compareOn && (
                  <p className="max-w-xs rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-card">{floor.scene_json.warnings[0]}</p>
                )}
                <div className="flex-1" />
                {readOnly && (
                  <div className="pointer-events-auto absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-slate-800 py-1 pl-3.5 pr-1 text-xs text-white shadow-float">
                    {t('workspace.readOnly')}
                    {latest && latest.id !== version.id
                      ? <button type="button" className="rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white" onClick={() => goVersion(latest.id)}>{t('workspace.viewLatest')}</button>
                      : <span className="pr-2" />}
                  </div>
                )}
                {work.previewDraft && (
                  <div role="status" className="pointer-events-auto absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-slate-800 py-1 pl-3.5 pr-1 text-xs text-white shadow-float">
                    {t('drafts.previewing', { room: work.previewDraft.room_name, name: work.previewDraft.designer_name })}
                    <button type="button" className="rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white" onClick={() => work.setPreviewId(null)}>{t('drafts.exitPreview')}</button>
                  </div>
                )}
                <div className="pointer-events-auto flex items-center gap-2">
                  {tab === '3d' && (
                    <SceneToggles lights={scene3d.lights} ceiling={scene3d.ceiling}
                      onLights={() => setScene3d((s) => ({ ...s, lights: !s.lights }))}
                      onCeiling={() => setScene3d((s) => ({ ...s, ceiling: !s.ceiling }))} />
                  )}
                  <CanvasMenu items={canvasMenu} />
                </div>
              </div>

              {/* bottom floating toolbar */}
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                <CanvasToolbar mode={tab} nav={nav} onNav={setNav}
                  onMode={isRender ? (m) => { setTab(m); if (m === '3d') { if (compareParam) setCompareParam(null); setMergeCompare(false); } } : null}
                  onZoomIn={() => zoomCanvas(ZOOM_IN)} onZoomOut={() => zoomCanvas(ZOOM_OUT)} onFit={fitCanvas}
                  compare={tab === '2d' && compareTarget && !mergeCompare ? {
                    on: compareOn, selected: compareOption(compareTarget), options: compareOptions.map(compareOption),
                    toggle: () => (compareOn ? stopCompare() : startCompare(compareTarget.id)), onPick: startCompare,
                  } : null}
                  comment={canComment && !compareOn && !mergeCompareOn ? { on: commenting, toggle: toggleCommentMode } : null} />
              </div>
            </>
          )}
        </main>

        {/* right: room · selected item · comments, with the draft / decision bar pinned to the bottom */}
        <aside ref={rightRef} tabIndex={-1} inert={narrow && drawer !== 'right'} aria-label={t('ws.panel')} className={`${drawerCls('right')} flex w-[90vw] max-w-sm flex-col border-l border-line lg:w-auto lg:max-w-none`}>
          {version ? (
            <>
              <PanelTabs items={tabs} value={activeTab} onChange={setRightTab} />
              <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === 'room' && floor && (
                  <RoomPanel room={room} floorName={floor.name} items={roomItems} selectedId={selEl} onSelect={clickElement} priced={isRender} role={viewer.role} owner={roomOwner && { id: roomOwner.designerId, name: roomOwner.designerName, label: avatars[roomOwner.designerId] }}
                    ownerAction={room?.room_id && allow('assignRooms').ok ? ownerMenu(room.room_id, room.name, 'link') : undefined}
                    onTakeOver={room && canTakeOver(room.room_id) ? () => takeOverRoom(room.room_id!) : undefined} />
                )}
                {activeTab === 'item' && (
                  <ItemPanel role={viewer.role} element={selElement} elements={elements} editable={editable} onSelect={clickElement} onChange={patchSelected}
                    onChooseAllRemaining={(n) => openSave(t('workspace.keepRemainingTitle'), n)}
                    onBrowse={selElement?.category ? () => setCatalogOpen(true) : undefined}
                    canComment={canComment} leadTools={leadEditing && !previewing} note={itemNote}
                    noteAvatar={itemOwner ? <Avatar id={itemOwner.designerId} name={itemOwner.designerName} label={avatars[itemOwner.designerId]} /> : undefined}
                    onTakeOver={selElement && canTakeOver(selElement.room_id) ? () => takeOverRoom(selElement.room_id!) : undefined}
                    change={mergeChange ? <ChangeSummary line={mergeChange} /> : undefined} />
                )}
                {activeTab === 'comments' && (
                  <CommentPanel threads={threads} me={viewer.role} floors={version.floors} floorId={floorId} labels={labels} selectedId={selComment}
                    room={room ? { name: room.name, has: (x) => threadRoom(x) === room.key } : null}
                    onSelect={(id) => {
                      const th = threads.find((x) => x.root.id === id);
                      const f = th && threadFloor(th);
                      if (f && f !== floorId) changeFloor(f);
                      patchCanvas({ selComment: id, selEl: th?.element?.id ?? null });
                    }}
                    target={composeTarget} onTarget={(tg) => patchCanvas({ target: tg })} composerPlaceholder={commentPlaceholder(composeTarget, isRender)}
                    mine={isMember ? { has: (x) => !!x.root.room_id && work.assignedRoomIds.includes(x.root.room_id) } : undefined}
                    draftTick={isMember ? {
                      can: (x) => x.root.status === 'OPEN' && allow('saveRoomDraft', x.root.room_id).ok,
                      checked: (x) => work.isTicked(x.root.room_id!, x.root.id),
                      onToggle: (x, on) => work.setTick(x.root.room_id!, x.root.id, on),
                    } : undefined}
                    allow={{ comment: canComment, reply: allow('reply').ok, respond: allow('respond').ok, address: allow('addressComment').ok }}
                    onCreate={async (content) => {
                      const ok = await postComment(composeTarget ?? { kind: 'general' }, content);
                      if (ok) patchCanvas({ target: null });
                      return ok;
                    }}
                    onAddress={async (id) => { await run(() => designApi.addressComment(id, version.id)); }}
                    onReply={async (id, content) => { await run(() => designApi.replyComment(version.id, id, content)); }}
                    onAccept={async (id) => { await run(() => designApi.acceptComment(id)); }}
                    onNotYet={async (id, content) => { await run(() => designApi.reopenComment(id, content)); }} />
                )}
              </div>

              {reviewing && (
                <RoomDraftsBlock drafts={work.reviewDrafts} avatars={avatars} elements={baseElements} previewId={work.previewId} onPreview={togglePreview} onPickLine={focusLine}
                  commentText={(id) => threads.find((x) => x.root.id === id)?.root.content}
                  comparing={mergeCompareOn} canCompare={!!summary?.lines.length} onCompare={toggleMergeCompare} />
              )}
              {leadEditing && (
                <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-4 py-3">
                  <span className={`min-w-0 flex-1 truncate text-[13px] ${leadCount ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                    {leadCount ? t('items.draft', { n: leadCount }) : work.readyDrafts.length ? t('drafts.readyCount', { n: work.readyDrafts.length }) : t('ws.noDraft')}
                  </span>
                  {leadCount > 0 && <Button size="sm" variant="ghost" onClick={discardLeadWork} disabled={busy}>{t('items.discard')}</Button>}
                  <Button size="sm" variant={leadCount || work.readyDrafts.length ? 'primary' : 'secondary'} disabled={!leadCount && !work.readyDrafts.length} loading={busy}
                    onClick={() => openSave('', 0)}>
                    {busy ? t('common.saving') : work.readyDrafts.length ? t('drafts.mergeSave') : t('common.save')}
                  </Button>
                </div>
              )}
              {memberDrafting && <MemberDraftBar rows={work.memberRows} hasRooms={work.assignedRoomIds.length > 0} busy={busy} onSave={saveMemberDraft} onReady={markMemberReady} />}
              {showDecision && (
                <section ref={decisionRef} tabIndex={-1} aria-label={t('workspace.decision')}
                  className="shrink-0 space-y-2 border-t border-line bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-inset focus:ring-brand/40">
                  {!!blockers.length && (
                    <ul className="space-y-1 text-xs leading-5 text-amber-800">
                      {blockers.map((line) => <li key={line} className="flex gap-1.5"><span aria-hidden>•</span><span className="min-w-0">{line}</span></li>)}
                    </ul>
                  )}
                  {noRoundsLeft && <p className="text-xs leading-5 text-slate-700">{t('workspace.noRoundsLeft')}</p>}
                  {requestState.reason && <p className="text-xs leading-5 text-slate-500">{requestState.reason}</p>}
                  {requestVisible && (
                    <Button block disabled={!requestState.ok} onClick={() => { setText(''); setDialog({ kind: 'request' }); }}>
                      {t('workspace.requestChanges')}
                    </Button>
                  )}
                </section>
              )}
            </>
          ) : <p className="p-4 text-sm text-slate-500">{t('workspace.waitingDesigner')}</p>}
        </aside>
      </div>

      {infoOpen && <ProjectInfoDrawer project={project} role={viewer.role} canManageTeam={allow('manageTeam').ok} onClose={() => setInfoOpen(false)} />}
      {catalogOpen && selElement?.category && (
        <CatalogDrawer element={{ ...selElement, category: selElement.category }} editable={editable}
          onPick={(p) => patchSelected({ product: p, choice: 'CHOSEN' })} onClose={() => setCatalogOpen(false)} />
      )}
      {uploading && (
        <UploadDialog projectId={projectId} floors={version?.floors ?? apartmentFloors} first={!layoutVersions.length}
          latest={!version || version.id === layoutVersions[0]?.id} limit={limits.LAYOUT_2D ?? null} major={allow('majorRevision')}
          wallHeight={version?.floors[0]?.scene_json.wall_height ?? 2.7}
          threads={openThreads.map((x) => x.root)} onClose={() => setUploading(false)}
          onDone={(v, addedLevel) => {
            pendingFloor.current = v.floors.find((f) => f.level === addedLevel)?.id ?? null;
            setUploading(false);
            goVersionNow(v.id);
          }} />
      )}
      {blocker.state === 'blocked' && (
        <Modal title={t('workspace.discardTitle')} onClose={() => blocker.reset()} footer={<>
          <Button onClick={() => blocker.reset()}>{t('workspace.keepEditing')}</Button>
          <Button variant="danger" onClick={() => {
            hasDraft.current = false;
            quickHasText.current = false;
            setDraft({});
            resetForVersion();
            patchCanvas({ quick: null });
            blocker.proceed();
          }}>{t('items.discard')}</Button>
        </>}>
          <p className="text-sm text-slate-700">{t('workspace.discardBody')}</p>
        </Modal>
      )}
      {dialog?.kind === 'notice' && (
        <Modal title={dialog.title} onClose={closeDialog} footer={dialog.action ? <>
          <Button onClick={closeDialog}>{t('common.close')}</Button>
          <Button variant="primary" autoFocus onClick={() => { const go = dialog.action!.run; setDialog(null); go(); }}>{dialog.action.label}</Button>
        </> : <Button variant="primary" autoFocus onClick={closeDialog}>{t('common.close')}</Button>}>
          <p className="text-sm text-slate-700">{dialog.body}</p>
        </Modal>
      )}
      {dialog?.kind === 'confirm' && (
        <Modal title={dialog.title} onClose={closeDialog} footer={<>
          <Button onClick={closeDialog}>{t('common.cancel')}</Button>
          <Button variant="primary" autoFocus disabled={busy} onClick={() => { const r = dialog.run; setDialog(null); r(); }}>{dialog.label}</Button>
        </>}>
          <p className="text-sm text-slate-700">{dialog.body}</p>
        </Modal>
      )}
      {dialog?.kind === 'assignUnsaved' && (
        <Modal title={t('team.unsavedTitle')} onClose={closeDialog} footer={<>
          <Button onClick={closeDialog}>{t('common.cancel')}</Button>
          <Button variant="danger" disabled={busy} onClick={async () => {
            const { roomId, designerId } = dialog;
            setDialog(null);
            if (await run(() => projectApi.updateRoomAssignments(project.id, [{ roomId, designerId }]))) clearRoomLocal(roomId);
          }}>{t('team.discardAndAssign')}</Button>
          <Button variant="primary" autoFocus onClick={() => { const { roomId, roomName, designerId, designerName } = dialog; openSave('', 0, { roomId, roomName, designerId, designerName }); }}>{t('team.saveAndAssign')}</Button>
        </>}>
          <p className="text-sm text-slate-700">{t('team.unsavedBody', { n: dialog.n, room: dialog.roomName })}</p>
        </Modal>
      )}
      {dialog?.kind === 'request' && version && (
        <Modal title={t('workspace.requestChanges')} onClose={closeDialog} footer={<>
          <Button onClick={closeDialog}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={async () => {
            if (await run(() => designApi.requestChanges(version.id, text.trim()))) setDialog({ kind: 'notice', title: t('workspace.sentTitle'), body: t('workspace.sentBody') });
          }}>{t('workspace.sendRequest')}</Button>
        </>}>
          <p className="mb-3 text-sm text-slate-700">{t('workspace.requestBody', { label: versionLabel(version.label, viewer.role) })}</p>
          {roundLimit && <p className="mb-3 text-sm font-medium text-slate-900">{t('workspace.roundsLeft', { n: roundLimit.remaining, max: roundLimit.limit })}</p>}
          <Textarea autoFocus rows={3} maxLength={2000} value={text} aria-label={t('workspace.requestChanges')} onChange={(e) => setText(e.target.value)} />
        </Modal>
      )}
      {dialog?.kind === 'save' && version && (
        <Modal title={t('workspace.saveTitle')} size="md" onClose={closeDialog} footer={<>
          <Button onClick={closeDialog}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={saveDraft}>{busy ? t('common.saving') : t('common.save')}</Button>
        </>}>
          <div className="space-y-4">
            <Field label={t('workspace.titleLabel')}>{(f) => <Input {...f} autoFocus value={text} maxLength={255} onChange={(e) => setText(e.target.value)} placeholder={t('workspace.savePlaceholder')} />}</Field>
            <RevisionPicker value={revision} onChange={setRevision} limit={limits.RENDER_3D ?? null} major={allow('majorRevision')} />
            {assignAfterSave && <Banner>{t('team.assignAfterSave', { room: assignAfterSave.roomName, name: assignAfterSave.designerName })}</Banner>}
            {chooseAll > 0 && <Banner tone="amber">{t('workspace.keepRemainingBody', { n: chooseAll })}</Banner>}
            {(leadCount > 0 || !work.readyDrafts.length) && <p className="text-xs text-slate-500">{t('workspace.draftCount', { n: leadCount })}</p>}
            {!!work.readyDrafts.length && summary && (
              <section aria-label={t('drafts.mergeSummary')} className="rounded-lg border border-line p-3 text-[13px]">
                <h3 className="font-medium text-slate-900">{t('drafts.mergeSummary')}</h3>
                <ul className="mt-1.5 space-y-1">
                  {summary.rooms.map((r) => (
                    <li key={r.key} className="flex justify-between gap-3 text-slate-700">
                      <span className="min-w-0 truncate">{r.room} · {t('drafts.changes', { n: r.count })}</span>
                      <span className="shrink-0 tabular-nums">{signedVnd(r.delta)}</span>
                    </li>
                  ))}
                  {summary.own && (
                    <li className="flex justify-between gap-3 text-slate-700">
                      <span className="min-w-0 truncate">{t('drafts.yourChanges')} · {t('drafts.changes', { n: summary.own.count })}</span>
                      <span className="shrink-0 tabular-nums">{signedVnd(summary.own.delta)}</span>
                    </li>
                  )}
                </ul>
                <p className="mt-2 flex justify-between gap-3 border-t border-line pt-2 font-semibold text-slate-900">
                  <span>{t('drafts.mergeTotal')}</span>
                  <span className="tabular-nums">{signedVnd(summary.total)}</span>
                </p>
              </section>
            )}
            <AddressedPicker threads={openThreads.map((x) => x.root)} value={addressed} onChange={setAddressed} invalid={invalidAddressed} />
            {saveError && <ErrorState message={saveError} />}
          </div>
        </Modal>
      )}
    </div>
  );
}
