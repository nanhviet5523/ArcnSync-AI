import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ChevronLeft, ChevronRight, Download, Eye, FileText, Image as ImageIcon, ImageOff, PackageCheck, Trash2 } from 'lucide-react';
import { Button, Card, ErrorState, Field, Modal, Skeleton, StatusChip, Textarea } from '@/components/ui';
import { errorText, formatDate, formatDateTime, formatMoney, t } from '@/i18n';
import type { UserRole } from '@/types/role';
import type { Project, ProjectRole } from '@/features/projects/projectApi';
import { getProjectContract } from '@/features/projects/services/contractsApi';
import type { MilestoneStatus } from '@/features/projects/services/contractsApi';
import { designApi } from '@/features/design-workspace/designApi';
import { quotationApi } from './quotationApi';
import { acceptOf, fileSize, HANDOVER_ASSET_TYPES, HANDOVER_REASON_MAX, handoverApi, isEditable, validateHandoverFiles } from './handoverApi';
import type { Handover, HandoverAsset, HandoverAssetType } from './handoverApi';
import { ConfirmDialog } from './QuotationDialogs';
import { canHomeownerDownload, canPreview, canSeeDxf, milestoneClear, submitHandoverBlock } from './handoverRules';
import { LazyGlbPreview } from './LazyGlbPreview';

type Dialog =
  | { kind: 'submit' }
  | { kind: 'approve' }
  | { kind: 'changes' }
  | { kind: 'delete'; asset: HandoverAsset }
  | { kind: 'image'; assetId: string }
  | { kind: 'model'; asset: HandoverAsset };

const TYPE_ICON: Record<HandoverAssetType, typeof ImageIcon> = { RENDER_IMAGE: ImageIcon, MODEL_3D: Box, DOCUMENT: FileText };

/**
 * Handover package of the final version (the one the accepted quotation points to), on the project overview.
 * - Lead uploads / deletes files and submits while NOT_SUBMITTED or CHANGES_REQUESTED.
 * - The homeowner approves the submitted package or asks for changes; after approving they download the package and DXF.
 * - Staff, admin and members read it and download the files.
 * Renders nothing until the homeowner accepts a quotation.
 */
export function HandoverCard({ project, role, projectRole, className = '', onChanged }: {
  project: Pick<Project, 'id' | 'code' | 'status'>; role: UserRole; projectRole: ProjectRole | null; className?: string;
  /** Called after approving, so the page reloads the project (payment, status). */
  onChanged?: () => void;
}) {
  const navigate = useNavigate();
  /** undefined = loading, null = no accepted quotation yet (no handover). */
  const [handover, setHandover] = useState<Handover | null | undefined>(undefined);
  const [floors, setFloors] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [progress, setProgress] = useState<{ type: HandoverAssetType; fraction: number } | null>(null);
  const inputs = useRef<Partial<Record<HandoverAssetType, HTMLInputElement | null>>>({});
  /** Lead: status of the RENDER_3D milestone, which must be paid before submitting. undefined = unknown, left to the backend. */
  const [render3d, setRender3d] = useState<MilestoneStatus | null | undefined>(undefined);

  const load = useCallback(async () => {
    setError('');
    try {
      const accepted = (await quotationApi.list(project.id)).find((q) => q.status === 'ACCEPTED');
      setHandover(accepted ? await handoverApi.get(accepted.designVersionId) : null);
    } catch (e) { setError(errorText(e)); }
  }, [project.id]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  // the DXF is part of what is handed over: list the floors once the package is approved
  const approved = handover?.status === 'APPROVED';
  const versionId = handover?.designVersionId;
  useEffect(() => {
    if (!approved || !versionId) return;
    let alive = true;
    designApi.getVersion(versionId).then(
      (v) => alive && setFloors([...v.floors].sort((a, b) => a.level - b.level).map((f) => ({ id: f.id, name: f.name }))),
      () => alive && setFloors([]),
    );
    return () => { alive = false; };
  }, [approved, versionId]);

  const lead = role === 'designer' && projectRole === 'LEAD';
  useEffect(() => {
    if (!lead) return;
    let alive = true;
    getProjectContract(project.id).then(
      (c) => alive && setRender3d(c ? c.milestones.find((m) => m.stageType === 'RENDER_3D')?.status ?? null : null),
      () => { /* unknown: the backend still refuses, and the error is shown */ },
    );
    return () => { alive = false; };
  }, [lead, project.id]);

  if (handover === null) return null;
  if (error) return <div className={className}><ErrorState message={error} onRetry={load} /></div>;
  if (handover === undefined) return <Skeleton className={`h-40 w-full rounded-card ${className}`} />;

  const h = handover;
  const homeowner = role === 'homeowner';
  const quoting = project.status === 'QUOTING';
  const editable = lead && quoting && isEditable(h);
  const reviewing = homeowner && quoting && h.status === 'SUBMITTED';
  // the homeowner downloads only after approving and paying the final installment; the team always
  const canDownload = !homeowner || canHomeownerDownload(h.status, h.milestone.status);
  const showDxf = canSeeDxf(role, h.status, h.milestone.status);
  const renders = h.assets.filter((a) => a.assetType === 'RENDER_IMAGE');
  const unpaid = h.milestone.status === 'INVOICED' || h.milestone.status === 'OVERDUE';
  const render3dBlocked = !milestoneClear(render3d);
  const block = submitHandoverBlock({ renders: renders.length, uploading: progress !== null, render3d });
  const blockReason = block === 'awaitingRender3dPayment' ? t('handover.waitRender3d') : block === 'needRender' ? t('handover.needRender') : undefined;

  /** Runs an action that returns the updated package. */
  const act = async (fn: () => Promise<Handover>) => {
    setActionError('');
    setHandover(await fn());
  };

  const upload = async (type: HandoverAssetType, files: File[]) => {
    if (!files.length) return;
    setActionError('');
    const existing = h.assets.filter((a) => a.assetType === type).length;
    const problem = validateHandoverFiles(type, files, existing);
    if (problem) { setActionError(problem); return; }
    setProgress({ type, fraction: 0 });
    try {
      setHandover(await handoverApi.upload(h.designVersionId, type, files, (fraction) => setProgress({ type, fraction })));
    } catch (e) { setActionError(errorText(e)); }
    finally { setProgress(null); }
  };

  const download = async (fn: () => Promise<void>) => {
    setActionError('');
    try { await fn(); } catch (e) { setActionError(errorText(e)); }
  };

  const who = homeowner ? 'homeowner' : lead ? 'lead' : 'team';
  const message = t(`handover.say.${h.status}.${who}`, { date: h.milestone.reviewDeadline ? formatDateTime(h.milestone.reviewDeadline) : '—' });

  const actions = editable ? (
    <Button variant="primary" size="sm" disabled={block !== null} title={blockReason}
      onClick={() => setDialog({ kind: 'submit' })}>{t(h.status === 'CHANGES_REQUESTED' ? 'handover.resubmit' : 'handover.submit')}</Button>
  ) : reviewing ? (
    <>
      <Button size="sm" onClick={() => setDialog({ kind: 'changes' })}>{t('handover.requestChanges')}</Button>
      <Button variant="primary" size="sm" onClick={() => setDialog({ kind: 'approve' })}>{t('handover.approve')}</Button>
    </>
  ) : homeowner && approved && unpaid ? (
    <Button variant="primary" size="sm" onClick={() => navigate(`/homeowner/payments?projectId=${encodeURIComponent(project.id)}`)}>{t('handover.pay')}</Button>
  ) : undefined;

  return (
    <Card className={className} bodyClassName="p-0"
      title={<span className="inline-flex flex-wrap items-center gap-2"><PackageCheck aria-hidden className="h-4 w-4 text-emerald-700" />{t('handover.title')}<StatusChip kind="handover" value={h.status} size="sm" /></span>}
      description={t('handover.milestone', { name: h.milestone.name, amount: formatMoney(h.milestone.amount) })}
      actions={actions}>
      <div className="space-y-3 border-b border-line px-5 py-4">
        <p className={`text-sm ${reviewing || (editable && h.status === 'CHANGES_REQUESTED') ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{message}</p>
        {editable && render3dBlocked && <p id="handover-wait-3d" className="text-sm font-medium text-amber-800">{t('handover.waitRender3d')}</p>}
        {homeowner && approved && !canDownload && <p className="text-sm font-medium text-amber-800">{t('handover.payToDownload')}</p>}
        {h.latestRevisionRequest && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="text-[13px] font-semibold">{t('handover.changesAsked', { date: formatDateTime(h.latestRevisionRequest.createdAt) })}</p>
            <p className="mt-0.5 whitespace-pre-line">{h.latestRevisionRequest.content}</p>
          </div>
        )}
        <p className="text-xs text-slate-500">
          <StatusChip kind="milestone" value={h.milestone.status} size="sm" />
          {h.milestone.approvedAt && <span className="ml-2">{t('handover.approvedOn', { date: formatDate(h.milestone.approvedAt) })}</span>}
          {h.milestone.paidAt && <span className="ml-2">{t('handover.paidOn', { date: formatDate(h.milestone.paidAt) })}</span>}
        </p>
        {actionError && <ErrorState message={actionError} />}
      </div>

      <div className="divide-y divide-slate-100">
        {HANDOVER_ASSET_TYPES.map((type) => {
          const files = h.assets.filter((a) => a.assetType === type);
          const Icon = TYPE_ICON[type];
          const uploading = progress?.type === type;
          const allowPreview = canPreview(role, h.status, type);
          // empty groups only matter to the Lead, who fills them
          if (!editable && files.length === 0) return null;
          return (
            <section key={type} aria-labelledby={`handover-${type}`} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={`handover-${type}`} className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                  <Icon aria-hidden className="h-4 w-4 text-slate-500" />{t(`handover.type.${type}`)}
                  <span className="font-normal text-slate-500">({files.length})</span>
                </h3>
                {editable && (
                  <div className="flex flex-wrap items-center gap-2">
                    {render3dBlocked && <span className="text-xs text-amber-800">{t('handover.waitRender3d')}</span>}
                    <input ref={(el) => { inputs.current[type] = el; }} type="file" multiple accept={acceptOf(type)} className="hidden"
                      aria-label={t(`handover.add.${type}`)}
                      onChange={(e) => { const picked = [...(e.target.files ?? [])]; e.target.value = ''; void upload(type, picked); }} />
                    <Button size="sm" disabled={progress !== null || render3dBlocked}
                      title={render3dBlocked ? t('handover.waitRender3d') : undefined}
                      aria-describedby={render3dBlocked ? 'handover-wait-3d' : undefined}
                      onClick={() => inputs.current[type]?.click()}>
                      {uploading ? t('handover.uploading', { pct: Math.round((progress?.fraction ?? 0) * 100) }) : `+ ${t(`handover.add.${type}`)}`}
                    </Button>
                  </div>
                )}
              </div>
              {editable && <p className="mt-0.5 text-[11px] text-slate-500">{t(`handover.rules.${type}`)}</p>}
              {files.length > 0 && type === 'RENDER_IMAGE' && allowPreview ? (
                <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {files.map((a) => (
                    <li key={a.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm">
                      <button type="button" onClick={() => setDialog({ kind: 'image', assetId: a.id })}
                        aria-label={t('handover.viewImage', { name: a.fileName })}
                        className="block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand">
                        <HandoverPreviewImage assetId={a.id} alt={a.fileName} className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                      </button>
                      <div className="flex items-center gap-1.5 px-2.5 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-800" title={a.fileName}>{a.fileName}</p>
                          <p className="text-[11px] tabular-nums text-slate-500">{fileSize(a.sizeBytes)}</p>
                        </div>
                        {canDownload && (
                          <button type="button" aria-label={t('handover.download', { name: a.fileName })} onClick={() => void download(() => handoverApi.download(a))}
                            className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
                            <Download aria-hidden className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {editable && (
                          <button type="button" aria-label={t('handover.delete', { name: a.fileName })} disabled={progress !== null} onClick={() => setDialog({ kind: 'delete', asset: a })}
                            className="shrink-0 rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
                            <Trash2 aria-hidden className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                      <span className="min-w-0 flex-1 truncate text-slate-800" title={a.fileName}>{a.fileName}</span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">{fileSize(a.sizeBytes)}</span>
                      {type === 'MODEL_3D' && allowPreview && (
                        <Button size="sm" onClick={() => setDialog({ kind: 'model', asset: a })}>
                          <Eye aria-hidden className="h-3.5 w-3.5" />{t('handover.view3d')}
                        </Button>
                      )}
                      {type === 'DOCUMENT' && homeowner && !canDownload && (
                        <span className="shrink-0 text-xs text-slate-500">{t('handover.documentLockedHint')}</span>
                      )}
                      {canDownload && (
                        <button type="button" aria-label={t('handover.download', { name: a.fileName })} onClick={() => void download(() => handoverApi.download(a))}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
                          <Download aria-hidden className="h-4 w-4" />
                        </button>
                      )}
                      {editable && (
                        <button type="button" aria-label={t('handover.delete', { name: a.fileName })} disabled={progress !== null} onClick={() => setDialog({ kind: 'delete', asset: a })}
                          className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {showDxf && floors.length > 0 && (
          <section aria-labelledby="handover-dxf" className="px-5 py-3">
            <h3 id="handover-dxf" className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <FileText aria-hidden className="h-4 w-4 text-slate-500" />{t('handover.dxf')}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {floors.map((f) => (
                <li key={f.id}>
                  <Button size="sm" onClick={() => void download(() => handoverApi.downloadDxf(h.designVersionId, f.id, `${project.code}-${f.name}.dxf`))}>
                    <Download aria-hidden className="h-4 w-4" />{f.name}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {h.assets.length === 0 && !editable && <p className="px-5 py-4 text-sm text-slate-500">{t('handover.empty')}</p>}
      </div>

      {dialog?.kind === 'submit' && (
        <ConfirmDialog title={t('handover.submit')} confirm={t(h.status === 'CHANGES_REQUESTED' ? 'handover.resubmit' : 'handover.submit')} onClose={() => setDialog(null)}
          body={t('handover.submitConfirm', { n: h.assets.length })}
          onConfirm={() => act(() => handoverApi.submit(h.designVersionId))} />
      )}
      {dialog?.kind === 'approve' && (
        <ConfirmDialog title={t('handover.approve')} confirm={t('handover.approve')} onClose={() => setDialog(null)}
          body={t('handover.approveConfirm', { amount: formatMoney(h.milestone.amount) })}
          onConfirm={async () => { await act(() => handoverApi.approve(h.designVersionId)); onChanged?.(); }} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog danger title={t('handover.deleteTitle')} confirm={t('handover.deleteButton')} onClose={() => setDialog(null)}
          body={t('handover.deleteConfirm', { name: dialog.asset.fileName })}
          onConfirm={async () => { await handoverApi.remove(dialog.asset.id); await load(); }} />
      )}
      {dialog?.kind === 'changes' && (
        <HandoverChangesDialog onClose={() => setDialog(null)}
          onSubmit={(reason) => act(() => handoverApi.requestChanges(h.designVersionId, reason))} />
      )}
      {dialog?.kind === 'image' && renders.length > 0 && (
        <HandoverImageLightbox
          images={renders}
          activeId={dialog.assetId}
          canDownload={canDownload}
          onSelect={(assetId) => setDialog({ kind: 'image', assetId })}
          onDownload={(asset) => void download(() => handoverApi.download(asset))}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'model' && (
        <Modal
          title={dialog.asset.fileName}
          size="lg"
          onClose={() => setDialog(null)}
          footer={<>
            <span className="mr-auto self-center text-xs tabular-nums text-slate-500">{fileSize(dialog.asset.sizeBytes)}</span>
            {canDownload && (
              <Button onClick={() => void download(() => handoverApi.download(dialog.asset))}>
                <Download aria-hidden className="h-4 w-4" />{t('handover.download', { name: dialog.asset.fileName })}
              </Button>
            )}
            <Button variant="primary" onClick={() => setDialog(null)}>{t('common.close')}</Button>
          </>}
        >
          <LazyGlbPreview assetId={dialog.asset.id} />
        </Modal>
      )}
    </Card>
  );
}

/** Fetches one handover preview image with Bearer token into an object URL, revoking it on unmount. */
function HandoverPreviewImage({ assetId, alt, className = '' }: { assetId: string; alt: string; className?: string }) {
  const [state, setState] = useState<{ id: string; url: string | null; failed: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    let objectUrl: string | null = null;
    handoverApi.previewBlob(assetId, ac.signal).then(
      (blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ id: assetId, url: objectUrl, failed: false });
      },
      () => {
        if (alive && !ac.signal.aborted) setState({ id: assetId, url: null, failed: true });
      },
    );
    return () => {
      alive = false;
      ac.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  const mine = state?.id === assetId ? state : null;
  if (mine?.failed) {
    return (
      <span className={`grid h-full w-full place-items-center bg-slate-100 px-2 text-center text-slate-400 ${className}`}>
        <span className="flex flex-col items-center gap-1">
          <ImageOff aria-hidden className="h-5 w-5" />
          <span className="text-[11px] text-slate-500">{t('handover.previewFailed')}</span>
        </span>
      </span>
    );
  }
  if (!mine?.url) return <span aria-hidden className={`block h-full w-full animate-pulse bg-slate-100 ${className}`} />;
  return <img src={mine.url} alt={alt} className={className} />;
}

/** Lightbox modal for viewing watermarked handover render previews full-size with keyboard prev/next. */
function HandoverImageLightbox({ images, activeId, canDownload, onSelect, onDownload, onClose }: {
  images: HandoverAsset[];
  activeId: string;
  canDownload: boolean;
  onSelect: (assetId: string) => void;
  onDownload: (asset: HandoverAsset) => void;
  onClose: () => void;
}) {
  const index = Math.max(0, images.findIndex((img) => img.id === activeId));
  const current = images[index] ?? images[0];
  const hasMultiple = images.length > 1;
  const go = useCallback((delta: number) => {
    const next = images[(index + delta + images.length) % images.length];
    if (next) onSelect(next.id);
  }, [images, index, onSelect]);

  useEffect(() => {
    if (!hasMultiple) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasMultiple, go]);

  if (!current) return null;
  return (
    <Modal
      title={current.fileName}
      size="lg"
      onClose={onClose}
      footer={<>
        <span className="mr-auto self-center text-xs tabular-nums text-slate-500">
          {fileSize(current.sizeBytes)}{hasMultiple ? ` · ${t('handover.imageCounter', { current: index + 1, total: images.length })}` : ''}
        </span>
        {hasMultiple && (
          <>
            <Button size="sm" onClick={() => go(-1)} aria-label={t('handover.prevImage')}>
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => go(1)} aria-label={t('handover.nextImage')}>
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Button>
          </>
        )}
        {canDownload && (
          <Button onClick={() => onDownload(current)}>
            <Download aria-hidden className="h-4 w-4" />{t('handover.download', { name: current.fileName })}
          </Button>
        )}
        <Button variant="primary" onClick={onClose}>{t('common.close')}</Button>
      </>}
    >
      <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <HandoverPreviewImage assetId={current.id} alt={current.fileName} className="max-h-[65vh] w-full object-contain" />
      </div>
    </Modal>
  );
}

/** Homeowner asks for changes to the submitted package (reason required). */
function HandoverChangesDialog({ onSubmit, onClose }: { onSubmit: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    try { await onSubmit(reason.trim()); onClose(); } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title={t('handover.requestChanges')} size="md" onClose={onClose} footer={<>
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} disabled={!reason.trim()} onClick={submit}>{t('handover.requestChanges')}</Button>
    </>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t('handover.requestChangesHint')}</p>
        <Field label={t('handover.reason')}>
          {(p) => <Textarea {...p} autoFocus rows={4} maxLength={HANDOVER_REASON_MAX} placeholder={t('handover.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

export default HandoverCard;
