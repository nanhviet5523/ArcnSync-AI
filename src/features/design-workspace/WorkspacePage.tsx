import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Box, Image as ImageIcon, Info, PanelLeftOpen, Upload } from 'lucide-react';
import { Banner, Button, ErrorState, Field, Input, Modal, Skeleton, Textarea } from '@/components/ui';
import { downloadFile, revokeBlobUrls } from '@/services/authService';
import { errorText, t } from '@/i18n';
import { designApi } from './designApi';
import { can, commentThreads, elementName, formatTime, versionLabel, isNotChosenItem, isUnknownItem, pinPoint, pinsToShow } from './logic';
import type { Action, CommentThread } from './logic';
import { CommentPanel } from './CommentPanel';
import type { CommentTarget } from './CommentPanel';
import { ComparePanel } from './ComparePanel';
import { FloorRoomTree } from './FloorRoomTree';
import { Plan2D } from './Plan2D';
import { frame } from './view';
import type { ClickPoint, Layers, Pin, ViewBox } from './Plan2D';
import { Scene3D } from './Scene3D';
import type { NavMode, Scene3DHandle } from './Scene3D';
import { ItemPanel } from './ItemPanel';
import { CatalogDrawer } from './CatalogDrawer';
import { RoomPanel } from './RoomPanel';
import { CanvasMenu, CanvasToolbar } from './CanvasToolbar';
import { WorkspaceBar } from './WorkspaceBar';
import { CommentHint, QuickComment } from './QuickComment';
import { ProjectInfoDrawer } from './ProjectInfoDrawer';
import { boxOf, elementRoom, floorRooms, roomAt } from './rooms';
import type { Comment, DesignElement, DesignVersion, Floor, Project, RevisionLimit, RevisionType, VersionSummary } from './types';

/** Workspace steps (steps.workspace): Concept, Layout, Products, Quotation, Approved. Completed = all done. */
const STEP_OF: Partial<Record<Project['status'], number>> = { IN_DESIGN: 1, PRODUCT_SELECTION: 2, QUOTING: 3, COMPLETED: 5 };

function RevisionPicker({ value, onChange, limit }: { value: RevisionType; onChange: (r: RevisionType) => void; limit: RevisionLimit | null }) {
  return (
    <fieldset>
      <div className="grid grid-cols-2 gap-2">
        {(['MINOR', 'MAJOR'] as const).map((r) => (
          <label key={r} className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${value === r ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong'}`}>
            <input type="radio" name="revision" className="sr-only" checked={value === r} onChange={() => onChange(r)} />
            <span className="font-medium text-slate-900">{t(r === 'MINOR' ? 'workspace.minor' : 'workspace.major')}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{t(r === 'MINOR' ? 'workspace.minorHint' : 'workspace.majorHint')}</span>
          </label>
        ))}
      </div>
      {limit && <p className={`mt-1.5 text-xs ${limit.remaining ? 'text-slate-500' : 'text-rose-600'}`}>{t('workspace.revisionsLeft', { remaining: limit.remaining, limit: limit.limit })}</p>}
    </fieldset>
  );
}

type FloorRow = { key: string; floor_id: string | null; level: number; name: string; floor_height_mm: number; file: File | null };

function UploadDialog({ floors, first, latest, limit, wallHeight, threads, onClose, onDone, projectId }: {
  floors: Floor[]; first: boolean; latest: boolean; limit: RevisionLimit | null; wallHeight: number;
  threads: Comment[]; projectId: string; onClose: () => void; onDone: (v: DesignVersion) => void;
}) {
  const [rows, setRows] = useState<FloorRow[]>(() => [...floors].sort((a, b) => a.level - b.level)
    .map((f) => ({ key: f.id, floor_id: f.id, level: f.level, name: f.name, floor_height_mm: f.floor_height_mm, file: null })));
  const [title, setTitle] = useState(first ? t('upload.firstTitle') : '');
  const [revision, setRevision] = useState<RevisionType>('MINOR');
  const [wall, setWall] = useState(wallHeight);
  const patch = (key: string, p: Partial<FloorRow>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const [ticked, setTicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const addFloor = () => {
    const level = Math.max(0, ...rows.map((r) => r.level)) + 1;
    setRows([...rows, { key: `new-${level}`, floor_id: null, level, name: t('upload.newFloorName', { n: level }), floor_height_mm: rows.at(-1)?.floor_height_mm ?? 3000, file: null }]);
  };
  const submit = async () => {
    const list = rows.filter((r) => r.file).map((r) => ({ ...r, name: r.name.trim(), file: r.file! }));
    if (!title.trim()) return setError(t('upload.errTitle'));
    if (!list.length) return setError(t('upload.errNoFile'));
    if (rows.some((r) => !r.floor_id && !r.file)) return setError(t('upload.errNewFloorFile'));
    if (list.some((r) => !r.name)) return setError(t('upload.errFloorName'));
    setBusy(true);
    try {
      onDone(await designApi.uploadDxf(projectId, { title: title.trim(), revision_type: first ? null : revision, wall_height_m: wall, files: list, addressed_comment_ids: ticked }));
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
        {!first && <RevisionPicker value={revision} onChange={setRevision} limit={limit} />}
        <Field label={t('upload.wallHeight')} className="max-w-[180px]">
          {(f) => <Input {...f} type="number" step={0.1} min={2.2} max={4.5} value={wall} onChange={(e) => setWall(Number(e.target.value))} />}
        </Field>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-end gap-3">
                {r.floor_id ? <p className="min-w-0 flex-1 pb-2 text-sm font-medium text-slate-900">{r.name}</p> : (
                  <Field label={t('upload.floorName')} className="min-w-0 flex-1">{(f) => <Input {...f} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} />}</Field>
                )}
                <Field label={t('upload.floorHeight')} className="w-32">
                  {(f) => <Input {...f} type="number" value={r.floor_height_mm} disabled={!!r.floor_id} onChange={(e) => patch(r.key, { floor_height_mm: Number(e.target.value) })} />}
                </Field>
                {!r.floor_id && (
                  <Button size="sm" variant="ghost" aria-label={t('upload.removeFloor', { name: r.name })} className="mb-0.5" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>×</Button>
                )}
              </div>
              <input type="file" accept=".dxf" aria-label={`DXF ${r.name}`} className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700"
                onChange={(e) => patch(r.key, { file: e.target.files?.[0] ?? null })} />
              {r.floor_id && !r.file && <p className="mt-1 text-xs text-slate-500">{first ? t('upload.noFileFirst') : t('upload.noFileCopy')}</p>}
            </div>
          ))}
          {first && <Button block onClick={addFloor} className="border-dashed">{t('upload.addFloor')}</Button>}
        </div>
        {!!threads.length && (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{t('upload.addressed')}</legend>
            {threads.map((c) => (
              <label key={c.id} className="mt-1.5 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={ticked.includes(c.id)} onChange={(e) => setTicked(e.target.checked ? [...ticked, c.id] : ticked.filter((x) => x !== c.id))} />
                <span className="min-w-0 break-words">{c.content}</span>
              </label>
            ))}
          </fieldset>
        )}
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

type Dialog =
  | { kind: 'notice'; title: string; body: string }
  | { kind: 'confirm'; title: string; body: string; label: string; run: () => void }
  | { kind: 'request' }
  | { kind: 'save' };

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
  const viewer = useMemo(() => designApi.getViewer(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [limits, setLimits] = useState<Record<string, RevisionLimit>>({});
  const [version, setVersion] = useState<DesignVersion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [floorId, setFloorId] = useState('');
  const [tab, setTab] = useState<'2d' | '3d'>('2d');
  const [showFurniture, setShowFurniture] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [compareWith, setCompareWith] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selEl, setSelEl] = useState<string | null>(null);
  const [selComment, setSelComment] = useState<string | null>(null);
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [target, setTarget] = useState<CommentTarget | null>(null);
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [nav, setNav] = useState<NavMode>('orbit');
  const [view2d, setView2d] = useState<ViewBox | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  // Comment mode: a click on an item (2D/3D) or a spot (2D) opens a comment box right there.
  const [commentMode, setCommentMode] = useState(false);
  const [quick, setQuick] = useState<{ target: CommentTarget; x: number; y: number; w: number; h: number } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  // 3D has no spot pins: an empty click in comment mode shows this hint where the user clicked
  const [hint, setHint] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(null), 3000);
    return () => clearTimeout(id);
  }, [hint]);
  // Esc closes an open popover or hint first, and only then leaves comment mode
  const overlayOpen = useRef(false);
  useEffect(() => { overlayOpen.current = !!(quick || hint); });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || el?.isContentEditable || (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      // only takes effect where the viewer may comment (see `commenting` below)
      if (e.key === 'c' || e.key === 'C') { setCommentMode((on) => !on); setQuick(null); setHint(null); }
      else if (e.key === 'Escape') {
        if (overlayOpen.current) { setQuick(null); setHint(null); } else setCommentMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const [stamp, setStamp] = useState('');
  const [draft, setDraft] = useState<Record<string, Partial<DesignElement>>>({});
  const shownId = useRef<string | null>(null);
  const sceneRef = useRef<Scene3DHandle>(null);
  const [rightTab, setRightTab] = useState<RightTab>('comments');
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [revision, setRevision] = useState<RevisionType>('MINOR');
  const [chooseAll, setChooseAll] = useState(0);
  const versionId = params.get('v');

  useEffect(() => () => revokeBlobUrls(), []);

  const load = useCallback(async () => {
    try {
      const [p, layout, render] = await Promise.all([
        designApi.getProject(projectId), designApi.listVersions(projectId, 'LAYOUT_2D'), designApi.listVersions(projectId, 'RENDER_3D'),
      ]);
      setProject(p);
      setStamp(formatTime(new Date().toISOString()));
      setLimits({ LAYOUT_2D: layout.revisionLimit, RENDER_3D: render.revisionLimit });
      const all = [...layout.items, ...render.items].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setVersions(all);
      const id = all.find((v) => v.id === versionId)?.id ?? (render.items.at(-1) ?? layout.items.at(-1))?.id;
      if (!id) { shownId.current = 'none'; setVersion(null); return; }
      const [v, cs] = await Promise.all([designApi.getVersion(id), designApi.listComments(id)]);
      setComments(cs);
      if (shownId.current !== v.id) {
        shownId.current = v.id;
        setTab(v.version_type === 'RENDER_3D' ? '3d' : '2d');
        setRightTab(v.version_type === 'RENDER_3D' && viewer.role === 'designer' ? 'item' : 'comments');
        setFloorId((f) => (v.floors.some((x) => x.id === f) ? f : [...v.floors].sort((a, b) => a.level - b.level)[0]?.id ?? ''));
        setSelEl(null); setSelComment(null); setTarget(null); setDraft({}); setRoomKey(null); setView2d(null); setCompareWith(null);
      }
      setVersion(v);
    } catch (e) { setError(errorText(e)); } finally { setLoaded(true); }
  }, [projectId, versionId, viewer.role]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const labels = useMemo(() => Object.fromEntries(versions.map((v) => [v.id, versionLabel(v.label, viewer.role)])), [versions, viewer.role]);
  const threads = useMemo(() => (version ? commentThreads(comments, version) : []), [comments, version]);
  const openThreads = threads.filter((x) => x.root.status === 'OPEN');
  // draft applied; a swapped product drops the old line total so prices follow the new product
  const elements = useMemo(() => (version?.elements ?? []).map((e) => {
    const d = draft[e.id];
    return d ? { ...e, ...d, ...(d.product ? { line_total: null } : {}) } : e;
  }), [version, draft]);
  const floorEls = useMemo(() => elements.filter((e) => e.floor_id === floorId), [elements, floorId]);
  const floor = version?.floors.find((f) => f.id === floorId);
  const rooms = useMemo(() => (floor ? floorRooms(floor.scene_json) : []), [floor]);
  const room = rooms.find((r) => r.key === roomKey) ?? null;

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-xl space-y-3">
          <ErrorState message={error} onRetry={() => { setError(''); load(); }} />
          <Link to="/" className="text-sm font-medium text-brand hover:underline">{t('common.back')}</Link>
        </div>
      </div>
    );
  }
  if (!loaded || !project) {
    return (
      <div className="grid h-dvh grid-rows-[56px_minmax(0,1fr)] bg-canvas">
        <div className="border-b border-line bg-surface" />
        <div className="grid min-h-0 grid-cols-1 gap-px lg:grid-cols-[240px_minmax(0,1fr)_340px]">
          <Skeleton className="hidden h-full rounded-none lg:block" /><Skeleton className="h-full rounded-none bg-[#ecebe7]" /><Skeleton className="hidden h-full rounded-none lg:block" />
        </div>
      </div>
    );
  }

  const ctx = version && {
    role: viewer.role, version, project, openCount: openThreads.length,
    unknownCount: elements.filter(isUnknownItem).length, notChosenCount: elements.filter(isNotChosenItem).length,
  };
  const allow = (a: Action) => (ctx ? can(a, ctx) : { ok: false });
  const canExport = allow('exportFiles').ok;
  const canComment = allow('comment').ok;
  const commenting = commentMode && canComment;
  const editable = allow('editItems').ok;
  const latest = versions[0];
  const current = versions.find((v) => v.id === version?.id) ?? null;
  const sameStage = versions.filter((v) => v.version_type === version?.version_type);
  const layoutVersions = versions.filter((v) => v.version_type === 'LAYOUT_2D');
  const canFirstUpload = viewer.role === 'designer' && project.status === 'IN_DESIGN' && !layoutVersions.length;
  const isRender = version?.version_type === 'RENDER_3D';
  const readOnly = !!version && (version.status === 'SUPERSEDED' || project.status === 'COMPLETED' || project.status === 'CANCELLED');
  const goVersion = (id: string) => { setParams((p) => { p.set('v', id); return p; }); setComparing(false); setDrawer(null); };
  const apartmentFloors: Floor[] = (project.apartment.floors ?? []).map((f) => ({ id: f.id, level: f.level, name: f.name, floor_height_mm: f.floorHeightMm }));
  const backTo = viewer.role === 'designer' ? '/designer/projects' : viewer.role === 'homeowner' ? '/homeowner/projects' : `/staff/projects/${project.id}`;

  // compare: default to the version just before the one being viewed, same stage
  const olderSame = [...sameStage].sort((a, b) => b.version_no - a.version_no).filter((v) => version && v.version_no < version.version_no);
  const compareTarget = sameStage.find((v) => v.id === compareWith && v.id !== version?.id) ?? olderSame[0] ?? sameStage.find((v) => v.id !== version?.id) ?? null;
  const compareOn = comparing && tab === '2d' && !!compareTarget;

  const threadFloor = (x: CommentThread) => x.element?.floor_id ?? x.root.floor_id;
  const threadRoom = (x: CommentThread) => {
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
    .concat(target?.kind === 'point' && target.floor_id === floorId ? [{ id: 'draft-pin', num: null, x: target.x, y: target.y, resolved: false, active: true }] : [])
    .concat(quick?.target.kind === 'point' && quick.target.floor_id === floorId ? [{ id: 'quick-pin', num: null, x: quick.target.x, y: quick.target.y, resolved: false, active: true }] : []);
  const selThread = threads.find((x) => x.root.id === selComment);
  const selPoint = selThread && pinPoint(selThread);
  const focus = selThread && selPoint && threadFloor(selThread) === floorId ? { key: `${selThread.root.id}-${floorId}`, ...selPoint } : null;
  const selElement = elements.find((e) => e.id === selEl) ?? null;
  // The Comments composer follows the selected item unless the user picked a spot or switched to a general comment (✕).
  const composeTarget: CommentTarget | null = target ?? (selElement ? { kind: 'element', element: selElement } : null);

  const changeFloor = (id: string) => { if (id === floorId) return; setFloorId(id); setRoomKey(null); setView2d(null); };
  const pickRoom = (key: string | null) => {
    setRoomKey(key);
    const r = rooms.find((x) => x.key === key);
    if (!r) return;
    setView2d(r.boundary ? frame(r.boundary, 0.8) : { x: r.label[0] - 2.5, y: -r.label[1] - 2.5, w: 5, h: 5 });
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
    setSelEl(e?.id ?? null);
    setSelComment(null);
    if (commenting && e && at) { setHint(null); setQuick({ target: { kind: 'element', element: e }, ...anchor(at) }); return; }
    if (commenting && !e && at && tab === '3d') { setQuick(null); setHint(anchor(at)); return; }
    setQuick(null);
    setHint(null);
    // a new selection re-attaches the Comments composer to the selected item
    setTarget(null);
    if (!e) return;
    if (e.floor_id !== floorId) changeFloor(e.floor_id);
    if (isRender) { setRightTab('item'); setDrawer('right'); }
    else if (canComment) { setRightTab('comments'); setTarget({ kind: 'element', element: e }); setDrawer('right'); }
  };
  const clickSpot = (p: { x: number; y: number }, at: ClickPoint) => {
    setSelEl(null);
    if (commenting) { setQuick({ target: { kind: 'point', ...p, floor_id: floorId }, ...anchor(at) }); return; }
    setTarget({ kind: 'point', ...p, floor_id: floorId }); setRightTab('comments'); setDrawer('right');
  };
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await load(); return true; } catch (e) {
      setDialog({ kind: 'notice', title: t('workspace.errorTitle'), body: errorText(e) });
      return false;
    } finally { setBusy(false); }
  };
  /** Same API for the Comments composer and the quick popover. */
  const postComment = (tg: CommentTarget, content: string) => run(() => designApi.createComment(version!.id, {
    content, floor_id: tg.kind === 'general' ? null : tg.kind === 'element' ? tg.element.floor_id : tg.floor_id,
    design_element_id: tg.kind === 'element' ? tg.element.id : null,
    pin_position: tg.kind === 'point' ? { x: tg.x, y: tg.y } : null,
  }));
  const approve = (layout: boolean) => run(async () => {
    await designApi.approve(version!.id);
    if (layout) {
      const render = await designApi.listVersions(projectId, 'RENDER_3D');
      const next = render.items.at(-1);
      if (next) goVersion(next.id);
    }
  });
  const saveDraft = () => run(async () => {
    const edits = Object.entries(draft).map(([id, p]) => {
      const original = version!.elements.find((e) => e.id === id);
      return {
        element_id: id,
        product_id: p.product && p.product.id !== original?.product?.id ? p.product.id : undefined,
        overrides: p.overrides ?? undefined,
      };
    }).filter((e) => e.product_id || e.overrides);
    const v = await designApi.saveEdits(version!.id, { title: text.trim(), revision_type: revision, edits, choose_all_remaining: chooseAll > 0 });
    setDraft({});
    setDialog(null);
    goVersion(v.id);
  });
  const patchSelected = (patch: Partial<DesignElement>) => selEl && setDraft((d) => ({ ...d, [selEl]: { ...d[selEl], ...patch } }));
  const dirty = Object.keys(draft).length;

  // primary action in the bar: designer uploads (Layout), homeowner approves
  const approveAction = version ? (version.version_type === 'LAYOUT_2D' ? 'approveLayout' : 'approveProducts') as Action : null;
  const approveState = approveAction ? allow(approveAction) : { ok: false };
  const requestState = allow('requestChanges');
  const askApprove = () => {
    const layout = approveAction === 'approveLayout';
    setDialog({
      kind: 'confirm',
      title: t(layout ? 'workspace.confirmLayout' : 'workspace.confirmProducts', { label: versionLabel(version!.label, viewer.role) }),
      body: t(layout ? 'workspace.confirmLayoutBody' : 'workspace.confirmProductsBody'),
      label: t('workspace.approve'), run: () => approve(layout),
    });
  };
  const primary = (allow('upload').ok || canFirstUpload) ? (
    <Button size="sm" variant="primary" onClick={() => setUploading(true)}><Upload aria-hidden className="h-4 w-4" />{t('workspace.uploadDxf')}</Button>
  ) : (approveState.ok || approveState.reason) && version ? (
    <Button size="sm" variant="primary" disabled={!approveState.ok} title={approveState.reason} onClick={askApprove}>
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
    `fixed inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} z-[70] min-h-0 bg-surface shadow-float transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${drawer === side ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'}`;
  const cols = leftCollapsed
    ? 'lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]'
    : 'lg:grid-cols-[220px_minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_340px]';

  const tabs: { id: RightTab; label: string; badge?: number }[] = [
    { id: 'room', label: t('ws.tabRoom') },
    ...(isRender ? [{ id: 'item' as const, label: t('ws.tabItem') }] : []),
    { id: 'comments', label: t('workspace.comments'), badge: openThreads.length },
  ];
  const activeTab = tabs.some((x) => x.id === rightTab) ? rightTab : 'comments';
  const showDecision = viewer.role === 'homeowner' && (approveState.reason || requestState.ok || requestState.reason);

  return (
    <div className="grid h-dvh grid-rows-[56px_minmax(0,1fr)] overflow-hidden bg-canvas font-sans text-slate-900">
      <WorkspaceBar role={viewer.role} backTo={backTo} title={project.title} stage={version?.version_type ?? null}
        versions={versions} current={current} onVersion={goVersion}
        canCompare={(v) => v.id !== version?.id && v.version_type === version?.version_type}
        onCompare={(id) => { setCompareWith(id); setComparing(true); setTab('2d'); }}
        download={downloadDxf} step={STEP_OF[project.status] ?? 0} primary={primary}
        secondary={viewer.role === 'homeowner' && (
          <Button size="sm" onClick={() => setInfoOpen(true)}><Info aria-hidden className="h-4 w-4" /><span className="hidden md:inline">{t('ws.projectInfo')}</span></Button>
        )}
        onOpenLeft={() => setDrawer('left')} onOpenRight={() => setDrawer('right')} openComments={openThreads.length} />

      <div className={`relative grid min-h-0 grid-cols-1 ${cols}`}>
        {drawer && <div className="fixed inset-0 z-[65] bg-slate-900/30 lg:hidden" onClick={() => setDrawer(null)} />}

        {/* left: floors → rooms */}
        <aside aria-label={t('ws.floorsRooms')} className={`${drawerCls('left')} w-[85vw] max-w-[280px] border-r border-line lg:w-auto lg:max-w-none ${leftCollapsed ? 'lg:hidden' : ''}`}>
          {version && floor ? (
            <FloorRoomTree floors={version.floors} floorId={floorId} onFloor={changeFloor} rooms={rooms} roomKey={roomKey}
              onRoom={(k) => { pickRoom(k); setDrawer(null); }} floorCounts={floorCounts} roomCounts={roomCounts}
              showFurniture={showFurniture} onShowFurniture={setShowFurniture} onCollapse={() => setLeftCollapsed(true)} />
          ) : <p className="p-4 text-sm text-slate-500">{t('workspace.noVersions')}</p>}
        </aside>

        {/* centre: drawing, edge to edge */}
        <main ref={mainRef} className={`relative min-h-0 min-w-0 bg-stage ${commenting ? 'comment-mode' : ''}`}>
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
                {compareOn && compareTarget ? (
                  <ComparePanel role={viewer.role} fromId={compareTarget.id} toId={version.id} floorId={floorId} layers={layers} view={view2d} onViewChange={setView2d} />
                ) : tab === '3d' ? (
                  <Scene3D ref={sceneRef} floors={version.floors} elements={elements} floorId={floorId} selectedId={selEl} onPick={clickElement}
                    fileName={`${project.code} ${version.label}`} navMode={nav}
                    room={room ? { key: room.key, center: roomCenter()!, boundary: room.boundary } : null}
                    onExportError={() => setDialog({ kind: 'notice', title: t('workspace.errorTitle'), body: t('scene.glbFailed') })} />
                ) : (
                  <Plan2D floor={floor} elements={floorEls} layers={layers} selectedId={selEl} onSelect={clickElement} pins={pins}
                    onPinClick={(id) => { setSelComment(id); setRightTab('comments'); setDrawer('right'); }} focus={focus}
                    room={room?.boundary} view={view2d} onViewChange={setView2d}
                    onEmptyClick={canComment ? clickSpot : undefined} />
                )}
              </div>

              <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-wrap content-around justify-around overflow-hidden opacity-[0.07]">
                {Array.from({ length: 6 }, (_, i) => <span key={i} className="-rotate-12 text-sm font-semibold">{viewer.email} {stamp}</span>)}
              </div>

              {hint && (
                <CommentHint x={hint.x} y={hint.y} bounds={{ width: hint.w, height: hint.h }}
                  onSwitch2D={() => { setHint(null); setTab('2d'); }} />
              )}
              {quick && (
                <QuickComment key={`${quick.x},${quick.y}`} x={quick.x} y={quick.y}
                  bounds={{ width: quick.w, height: quick.h }}
                  title={quick.target.kind === 'element' ? t('comments.forItem', { name: elementName(quick.target.element) }) : t('ws.commentAtSpot')}
                  onCancel={() => setQuick(null)}
                  onSend={async (content) => { const ok = await postComment(quick.target, content); if (ok) setQuick(null); return ok; }} />
              )}

              {/* top overlays */}
              <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start gap-2">
                {leftCollapsed && (
                  <button type="button" onClick={() => setLeftCollapsed(false)} aria-label={t('ws.expand')} title={t('ws.expand')}
                    className="pointer-events-auto hidden h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-slate-700 shadow-float hover:bg-slate-50 lg:flex">
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
                      ? <button type="button" className="rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25" onClick={() => goVersion(latest.id)}>{t('workspace.viewLatest')}</button>
                      : <span className="pr-2" />}
                  </div>
                )}
                <div className="pointer-events-auto"><CanvasMenu items={canvasMenu} /></div>
              </div>

              {/* bottom floating toolbar */}
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                <CanvasToolbar mode={tab} nav={nav} onNav={setNav}
                  onMode={isRender ? (m) => { setTab(m); if (m === '3d') setComparing(false); } : null}
                  onReset={() => (tab === '3d' && !compareOn ? sceneRef.current?.resetView() : setView2d(null))}
                  compare={tab === '2d' && compareTarget ? { label: t('ws.compareWith', { label: versionLabel(compareTarget.label, viewer.role) }), on: compareOn, toggle: () => setComparing(!comparing) } : null}
                  comment={canComment && !compareOn ? { on: commenting, toggle: () => { setCommentMode(!commentMode); setQuick(null); } } : null} />
              </div>
            </>
          )}
        </main>

        {/* right: room · selected item · comments, with the draft / decision bar pinned to the bottom */}
        <aside aria-label={t('ws.panel')} className={`${drawerCls('right')} flex w-[90vw] max-w-sm flex-col border-l border-line lg:w-auto lg:max-w-none`}>
          {version ? (
            <>
              <PanelTabs items={tabs} value={activeTab} onChange={setRightTab} />
              <div className="min-h-0 flex-1">
                {activeTab === 'room' && floor && (
                  <RoomPanel room={room} floorName={floor.name} items={roomItems} selectedId={selEl} onSelect={clickElement} priced={isRender} />
                )}
                {activeTab === 'item' && (
                  <ItemPanel element={selElement} elements={elements} editable={editable} onSelect={clickElement} onChange={patchSelected}
                    onChooseAllRemaining={(n) => { setText(t('workspace.keepRemainingTitle')); setRevision('MINOR'); setChooseAll(n); setDialog({ kind: 'save' }); }}
                    onBrowse={selElement?.category ? () => setCatalogOpen(true) : undefined}
                    onComment={canComment && selElement ? () => { setTarget({ kind: 'element', element: selElement }); setRightTab('comments'); } : undefined} />
                )}
                {activeTab === 'comments' && (
                  <CommentPanel threads={threads} me={viewer.role} floors={version.floors} floorId={floorId} labels={labels} selectedId={selComment}
                    room={room ? { name: room.name, has: (x) => threadRoom(x) === room.key } : null}
                    onSelect={(id) => {
                      setSelComment(id);
                      const th = threads.find((x) => x.root.id === id);
                      setSelEl(th?.element?.id ?? null);
                      const f = th && threadFloor(th);
                      if (f && f !== floorId) changeFloor(f);
                    }}
                    target={composeTarget} onTarget={setTarget}
                    allow={{ comment: canComment, reply: allow('reply').ok, respond: allow('respond').ok }}
                    onCreate={async (content) => {
                      const ok = await postComment(composeTarget ?? { kind: 'general' }, content);
                      if (ok) setTarget(null);
                      return ok;
                    }}
                    onReply={async (id, content) => { await run(() => designApi.replyComment(version.id, id, content)); }}
                    onAccept={async (id) => { await run(() => designApi.acceptComment(id)); }}
                    onNotYet={async (id, content) => { await run(() => designApi.reopenComment(id, content)); }} />
                )}
              </div>

              {editable && (
                <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-4 py-3">
                  <span className={`min-w-0 flex-1 truncate text-[13px] ${dirty ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                    {dirty ? t('items.draft', { n: dirty }) : t('ws.noDraft')}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setDraft({})} disabled={!dirty || busy}>{t('items.discard')}</Button>
                  <Button size="sm" variant="primary" disabled={!dirty} loading={busy}
                    onClick={() => { setText(''); setRevision('MINOR'); setChooseAll(0); setDialog({ kind: 'save' }); }}>
                    {busy ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              )}
              {showDecision && (
                <div className="shrink-0 space-y-2 border-t border-line bg-surface px-4 py-3">
                  {approveState.reason && <p className="text-xs leading-5 text-amber-800">{approveState.reason}</p>}
                  {(requestState.ok || requestState.reason) && (
                    <Button block disabled={!requestState.ok} title={requestState.reason} onClick={() => { setText(''); setDialog({ kind: 'request' }); }}>
                      {t('workspace.requestChanges')}
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : <p className="p-4 text-sm text-slate-500">{t('workspace.waitingDesigner')}</p>}
        </aside>
      </div>

      {infoOpen && <ProjectInfoDrawer project={project} onClose={() => setInfoOpen(false)} />}
      {catalogOpen && selElement?.category && (
        <CatalogDrawer element={{ ...selElement, category: selElement.category }} editable={editable}
          onPick={(p) => patchSelected({ product: p, choice: 'CHOSEN' })} onClose={() => setCatalogOpen(false)} />
      )}
      {uploading && (
        <UploadDialog projectId={projectId} floors={version?.floors ?? apartmentFloors} first={!layoutVersions.length}
          latest={!version || version.id === layoutVersions[0]?.id} limit={limits.LAYOUT_2D ?? null}
          wallHeight={version?.floors[0]?.scene_json.wall_height ?? 2.7}
          threads={openThreads.map((x) => x.root)} onClose={() => setUploading(false)}
          onDone={(v) => { setUploading(false); goVersion(v.id); }} />
      )}
      {dialog?.kind === 'notice' && (
        <Modal title={dialog.title} onClose={closeDialog} footer={<Button variant="primary" autoFocus onClick={closeDialog}>{t('common.close')}</Button>}>
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
      {dialog?.kind === 'request' && version && (
        <Modal title={t('workspace.requestChanges')} onClose={closeDialog} footer={<>
          <Button onClick={closeDialog}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={async () => {
            if (await run(() => designApi.requestChanges(version.id, text.trim()))) setDialog({ kind: 'notice', title: t('workspace.sentTitle'), body: t('workspace.sentBody') });
          }}>{t('workspace.sendRequest')}</Button>
        </>}>
          <p className="mb-3 text-sm text-slate-700">{t('workspace.requestBody', { label: versionLabel(version.label, viewer.role) })}</p>
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
            <RevisionPicker value={revision} onChange={setRevision} limit={limits.RENDER_3D ?? null} />
            {chooseAll > 0 && <Banner tone="amber">{t('workspace.keepRemainingBody', { n: chooseAll })}</Banner>}
            <p className="text-xs text-slate-500">{t('workspace.draftCount', { n: dirty })}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
