import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ImageOff, Images, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Modal, Skeleton, StatusChip } from '@/components/ui';
import { formatDate, t } from '@/i18n';
import type { UserRole } from '@/types/role';
import { canOpenWorkspace } from '@/features/projects/projectApi';
import type { ProjectRole, ProjectStatus } from '@/features/projects/projectApi';
import { ConfirmDialog } from '@/features/quotations/QuotationDialogs';
import {
  CONCEPT_IMAGE_TYPES, MAX_CONCEPT_IMAGES, MAX_SUBMITTED_CONCEPTS,
  conceptApi, conceptErrorText, conceptImageUrl, conceptRights, conceptSummary, displayStatus, validateConceptFiles,
} from './conceptApi';
import type { Concept, ConceptImage, ConceptRights } from './conceptApi';
import { ConceptFormModal } from './ConceptFormModal';
import type { ProjectConcepts } from './useProjectConcepts';

/** One concept image, fetched with the token and shown from an object URL. */
function ConceptImg({ image, className = '', alt }: { image: ConceptImage | undefined; className?: string; alt: string }) {
  const [state, setState] = useState<{ id: string; url: string | null; failed: boolean } | null>(null);
  useEffect(() => {
    if (!image) return;
    let alive = true;
    conceptImageUrl(image).then(
      (url) => alive && setState({ id: image.id, url, failed: false }),
      () => alive && setState({ id: image.id, url: null, failed: true }),
    );
    return () => { alive = false; };
  }, [image]);
  const mine = state && image && state.id === image.id ? state : null;
  if (!image || mine?.failed) {
    return <span className={`grid place-items-center bg-slate-100 text-brand-on-dark ${className}`}><ImageOff aria-hidden className="h-6 w-6" /><span className="sr-only">{t('concepts.imageFailed')}</span></span>;
  }
  if (!mine?.url) return <span aria-hidden className={`block animate-pulse bg-slate-100 ${className}`} />;
  return <img src={mine.url} alt={alt} className={`object-cover ${className}`} />;
}

type Dialog =
  | { kind: 'create' }
  | { kind: 'view'; id: string }
  | { kind: 'edit'; id: string }
  | { kind: 'submit'; id: string }
  | { kind: 'choose'; id: string }
  | { kind: 'deleteImage'; id: string; image: ConceptImage };

/**
 * Concept stage on the project page (Core 2). The Lead uploads 2–3 design directions as images; the homeowner sees the
 * submitted ones and chooses one; Members, Staff and Admin only look. Once one is chosen nothing can change any more.
 */
export function ConceptCard({ projectId, projectStatus, role, projectRole, data, onChanged, className = '' }: {
  projectId: string;
  projectStatus: ProjectStatus;
  role: UserRole;
  projectRole: ProjectRole | null;
  data: ProjectConcepts;
  /** After the homeowner chooses: the page may want to refresh the project (next step, stepper). */
  onChanged?: () => void;
  className?: string;
}) {
  const { concepts, error, hasLayout, reload } = data;
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const location = useLocation();
  const box = useRef<HTMLDivElement>(null);

  // the workspace links here with #concept: scroll once the list is on screen
  const loaded = concepts !== null;
  useEffect(() => {
    if (loaded && location.hash === '#concept') box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loaded, location.hash]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!canOpenWorkspace(projectStatus)) return null;
  // projects made before concepts existed: a layout but no concept, nothing to show
  if (concepts && !concepts.length && (hasLayout || projectStatus !== 'IN_DESIGN')) return null;

  const list = concepts ?? [];
  const { approved, submittedCount } = conceptSummary(list);
  const rights = conceptRights({ role, projectRole, projectStatus, approved: !!approved, hasLayout });
  const homeowner = role === 'homeowner';
  const limitReached = submittedCount >= MAX_SUBMITTED_CONCEPTS;
  const current = dialog && 'id' in dialog ? list.find((c) => c.id === dialog.id) ?? null : null;

  const done = async (message: string) => {
    setActionError('');
    setNotice(message);
    await reload();
  };

  const intro = rights.canEdit ? t('concepts.introLead')
    : rights.canChoose ? (submittedCount ? t('concepts.introChoose') : '')
      : '';

  return (
    <div id="concept" ref={box} className={`scroll-mt-4 ${className}`}>
      <Card
        title={t('concepts.title')}
        description={intro || undefined}
        actions={rights.canEdit && loaded ? <Button size="sm" variant="primary" onClick={() => setDialog({ kind: 'create' })}><Plus aria-hidden className="h-4 w-4" />{t('concepts.createButton')}</Button> : undefined}
      >
        <div className="space-y-3">
          {rights.reason && loaded && <p className="text-xs text-slate-500">{rights.reason}</p>}
          {rights.canEdit && submittedCount > 0 && (
            <p className={`text-xs ${limitReached ? 'text-amber-700' : 'text-slate-500'}`}>
              {limitReached ? t('concepts.limitReached', { max: MAX_SUBMITTED_CONCEPTS }) : t('concepts.waitingCount', { n: submittedCount, max: MAX_SUBMITTED_CONCEPTS })}
            </p>
          )}
          {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{notice}</p>}
          {actionError && <ErrorState message={actionError} />}

          {error ? <ErrorState message={error} onRetry={() => void reload()} />
            : !concepts ? (
              <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-52 w-full rounded-xl" /><Skeleton className="hidden h-52 w-full rounded-xl sm:block" />
              </div>
            ) : !list.length ? (
              <EmptyState compact title={t(rights.canEdit ? 'concepts.emptyLead' : homeowner ? 'concepts.emptyHomeowner' : 'concepts.emptyOther')} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c, i) => {
                  const shown = displayStatus(c, approved);
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => setDialog({ kind: 'view', id: c.id })}
                        className={`group block w-full overflow-hidden rounded-xl border bg-surface text-left shadow-card transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${shown === 'APPROVED' ? 'border-emerald-400 ring-2 ring-emerald-100' : shown === 'NOT_CHOSEN' ? 'border-line opacity-75' : 'border-line'}`}>
                        <span className="relative block">
                          <ConceptImg image={c.images[0]} alt={c.title} className="block h-40 w-full" />
                          <span className="absolute left-2 top-2 rounded-full bg-surface/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm">{t('concepts.label', { letter: String.fromCharCode(65 + (i % 26)) })}</span>
                          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-dark/70 px-2 py-0.5 text-[11px] font-semibold text-white"><Images aria-hidden className="h-3 w-3" />{c.images.length}</span>
                        </span>
                        <span className="flex items-start justify-between gap-2 px-3 py-2.5">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">{c.title}</span>
                            {c.description && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{c.description}</span>}
                          </span>
                          <StatusChip kind="concept" value={shown} size="sm" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
        </div>
      </Card>

      {dialog?.kind === 'create' && (
        <ConceptFormModal projectId={projectId} onClose={() => setDialog(null)}
          onSaved={(c) => { setDialog({ kind: 'view', id: c.id }); void done(t('concepts.done.created')); }} />
      )}
      {dialog?.kind === 'edit' && current && (
        <ConceptFormModal projectId={projectId} concept={current} onClose={() => setDialog({ kind: 'view', id: current.id })}
          onSaved={() => { setDialog({ kind: 'view', id: current.id }); void done(t('concepts.done.saved')); }} />
      )}
      {dialog?.kind === 'view' && current && (
        <ConceptViewer concept={current} index={list.indexOf(current)} approved={approved} rights={rights} limitReached={limitReached}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ kind: 'edit', id: current.id })}
          onSubmit={() => setDialog({ kind: 'submit', id: current.id })}
          onChoose={() => setDialog({ kind: 'choose', id: current.id })}
          onDeleteImage={(image) => setDialog({ kind: 'deleteImage', id: current.id, image })}
          onImagesAdded={(n) => void done(t('concepts.done.imagesAdded', { n }))} />
      )}
      {dialog?.kind === 'submit' && current && (
        <ConfirmDialog title={t('concepts.submitTitle')} confirm={t('concepts.submit')}
          body={t('concepts.submitBody', { title: current.title })}
          onClose={() => setDialog({ kind: 'view', id: current.id })}
          onConfirm={async () => { await conceptApi.submit(current.id).catch(rethrowConcept); await done(t('concepts.done.submitted')); }} />
      )}
      {dialog?.kind === 'choose' && current && (
        <ConfirmDialog title={t('concepts.chooseTitle')} confirm={t('concepts.choose')}
          body={t('concepts.chooseBody', { title: current.title })}
          onClose={() => setDialog(null)}
          onConfirm={async () => { await conceptApi.choose(current.id).catch(rethrowConcept); await done(t('concepts.done.chosen')); onChanged?.(); }} />
      )}
      {dialog?.kind === 'deleteImage' && current && (
        <ConfirmDialog danger title={t('concepts.deleteImageTitle')} confirm={t('concepts.deleteImage')}
          body={t('concepts.deleteImageBody', { name: dialog.image.fileName })}
          onClose={() => setDialog({ kind: 'view', id: current.id })}
          onConfirm={async () => { await conceptApi.deleteImage(dialog.image.id).catch(rethrowConcept); await done(t('concepts.done.imageDeleted')); }} />
      )}
    </div>
  );
}

/** ConfirmDialog shows errorText(e): give it the concept sentence instead. */
function rethrowConcept(e: unknown): never {
  throw new Error(conceptErrorText(e));
}

/** Large view of one concept: every image, the description, and the actions this viewer has. */
function ConceptViewer({ concept, index, approved, rights, limitReached, onClose, onEdit, onSubmit, onChoose, onDeleteImage, onImagesAdded }: {
  concept: Concept; index: number; approved: Concept | null; rights: ConceptRights; limitReached: boolean;
  onClose: () => void; onEdit: () => void; onSubmit: () => void; onChoose: () => void;
  onDeleteImage: (image: ConceptImage) => void; onImagesAdded: (n: number) => void;
}) {
  const [shownId, setShownId] = useState<string | null>(null);
  const image = concept.images.find((i) => i.id === shownId) ?? concept.images[0];
  const [bigUrl, setBigUrl] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!image) return;
    let alive = true;
    conceptImageUrl(image).then((url) => alive && setBigUrl({ id: image.id, url }), () => undefined);
    return () => { alive = false; };
  }, [image]);
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const status = displayStatus(concept, approved);
  const canEditThis = rights.canEdit && (concept.status === 'DRAFT' || concept.status === 'SUBMITTED');
  const left = MAX_CONCEPT_IMAGES - concept.images.length;

  const addImages = async (files: File[]) => {
    if (!files.length) return;
    const problem = validateConceptFiles(files, concept.images.length);
    if (problem) { setError(problem); return; }
    setError('');
    setProgress(0);
    try {
      await conceptApi.addImages(concept.id, files, setProgress);
      onImagesAdded(files.length);
    } catch (e) {
      setError(conceptErrorText(e));
    } finally {
      setProgress(null);
    }
  };

  return (
    <Modal title={`${t('concepts.label', { letter: String.fromCharCode(65 + (index % 26)) })} · ${concept.title}`} size="lg" onClose={progress !== null ? () => undefined : onClose} footer={<>
      <Button disabled={progress !== null} onClick={onClose}>{t('common.close')}</Button>
      {canEditThis && <Button disabled={progress !== null} onClick={onEdit}>{t('concepts.edit')}</Button>}
      {canEditThis && concept.status === 'DRAFT' && (
        <Button variant="primary" disabled={limitReached || progress !== null} title={limitReached ? t('concepts.limitReached', { max: MAX_SUBMITTED_CONCEPTS }) : undefined} onClick={onSubmit}>{t('concepts.submit')}</Button>
      )}
      {rights.canChoose && concept.status === 'SUBMITTED' && <Button variant="primary" onClick={onChoose}>{t('concepts.choose')}</Button>}
    </>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <StatusChip kind="concept" value={status} size="sm" />
          {concept.createdBy && <span>{t('concepts.byLine', { name: concept.createdBy.fullName, date: formatDate(concept.createdAt) })}</span>}
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-slate-100">
          {image && bigUrl?.id === image.id ? (
            <a href={bigUrl.url} target="_blank" rel="noreferrer" aria-label={t('concepts.openFull', { name: image.fileName })}>
              <img src={bigUrl.url} alt={image.fileName} className="max-h-[55vh] w-full object-contain" />
            </a>
          ) : <ConceptImg image={image} alt={concept.title} className="block h-72 w-full" />}
        </div>

        {(concept.images.length > 1 || canEditThis) && (
          <ul className="flex flex-wrap gap-2">
            {concept.images.map((img) => (
              <li key={img.id} className="relative">
                <button type="button" onClick={() => setShownId(img.id)} aria-label={t('concepts.showImage', { name: img.fileName })} aria-pressed={img.id === image?.id}
                  className={`block h-16 w-16 overflow-hidden rounded-lg border-2 ${img.id === image?.id ? 'border-brand' : 'border-transparent'}`}>
                  <ConceptImg image={img} alt="" className="h-full w-full" />
                </button>
                {canEditThis && concept.images.length > 1 && (
                  <button type="button" aria-label={t('concepts.deleteImageNamed', { name: img.fileName })} disabled={progress !== null} onClick={() => onDeleteImage(img)}
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-surface text-rose-700 shadow ring-1 ring-slate-200 hover:bg-rose-50">
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
            {canEditThis && left > 0 && (
              <li>
                <input ref={input} type="file" multiple accept={CONCEPT_IMAGE_TYPES.join(',')} className="hidden"
                  onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; void addImages(files); }} />
                <button type="button" disabled={progress !== null} onClick={() => input.current?.click()}
                  className="grid h-16 w-16 place-items-center rounded-lg border-2 border-dashed border-slate-300 text-center text-[11px] font-medium text-slate-600 hover:border-brand hover:text-brand disabled:cursor-wait">
                  {progress !== null ? `${Math.round(progress * 100)}%` : <><Plus aria-hidden className="mx-auto h-4 w-4" />{t('concepts.addImages')}</>}
                </button>
              </li>
            )}
          </ul>
        )}
        {canEditThis && <p className="text-[11px] text-slate-500">{t('concepts.imageCount', { n: concept.images.length, max: MAX_CONCEPT_IMAGES })} · {t('concepts.imageRules', { max: MAX_CONCEPT_IMAGES })}</p>}
        {error && <ErrorState message={error} />}

        {concept.description
          ? <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{concept.description}</p>
          : <p className="text-sm text-slate-500">{t('concepts.noDescription')}</p>}

        {rights.canChoose && concept.status === 'SUBMITTED' && <p className="text-xs text-slate-500">{t('concepts.chooseNote')}</p>}
        {canEditThis && concept.status === 'DRAFT' && limitReached && <p className="text-xs text-amber-700">{t('concepts.limitReached', { max: MAX_SUBMITTED_CONCEPTS })}</p>}
        {canEditThis && concept.status === 'DRAFT' && !limitReached && <p className="text-xs text-slate-500">{t('concepts.draftNote')}</p>}
      </div>
    </Modal>
  );
}
