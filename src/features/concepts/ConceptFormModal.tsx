import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button, ErrorState, Field, Input, Modal, Textarea } from '@/components/ui';
import { t } from '@/i18n';
import {
  CONCEPT_DESCRIPTION_MAX, CONCEPT_IMAGE_TYPES, CONCEPT_TITLE_MAX, MAX_CONCEPT_IMAGES,
  conceptApi, conceptErrorText, validateConceptFiles,
} from './conceptApi';
import type { Concept } from './conceptApi';

/** Local previews of picked files; the object URLs are revoked when the list changes or the modal closes. */
function usePreviews(files: readonly File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

/**
 * Drop zone + picker for PNG / JPEG. Files are checked here (type, 20 MB, total ≤ 10) before anything is sent;
 * `existing` = images already on the concept.
 */
export function ImagePicker({ files, onChange, existing = 0, disabled, onError }: {
  files: File[]; onChange: (files: File[]) => void; existing?: number; disabled?: boolean; onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const previews = usePreviews(files);
  const add = (picked: File[]) => {
    if (!picked.length) return;
    const next = [...files, ...picked];
    const problem = validateConceptFiles(next, existing);
    if (problem) { onError(problem); return; }
    onError('');
    onChange(next);
  };
  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) add([...e.dataTransfer.files]);
  };
  const left = MAX_CONCEPT_IMAGES - existing - files.length;
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${over ? 'border-brand bg-brand-soft' : 'border-slate-300 bg-slate-50'}`}
      >
        <ImagePlus aria-hidden className="h-6 w-6 text-slate-400" />
        <p className="text-sm text-slate-700">{t('concepts.dropHint')}</p>
        <input ref={input} type="file" multiple accept={CONCEPT_IMAGE_TYPES.join(',')} className="hidden"
          onChange={(e) => { const picked = [...(e.target.files ?? [])]; e.target.value = ''; add(picked); }} />
        <Button size="sm" disabled={disabled || left <= 0} onClick={() => input.current?.click()}>{t('concepts.pickImages')}</Button>
        <p className="text-[11px] text-slate-500">{t('concepts.imageRules', { max: MAX_CONCEPT_IMAGES })}</p>
      </div>
      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
              {!disabled && (
                <button type="button" aria-label={t('concepts.removePicked', { name: f.name })} onClick={() => onChange(files.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-rose-700 shadow hover:bg-white">
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-xs text-slate-500">{t('concepts.imageCount', { n: existing + files.length, max: MAX_CONCEPT_IMAGES })}</p>
    </div>
  );
}

/**
 * Create a concept (title, description, 1–10 images) or edit an existing one's title and description.
 * Images of an existing concept are managed in the viewer.
 */
export function ConceptFormModal({ projectId, concept, onClose, onSaved }: {
  projectId: string;
  /** Present = edit title / description. */
  concept?: Concept;
  onClose: () => void;
  onSaved: (saved: Concept) => void;
}) {
  const editing = !!concept;
  const [title, setTitle] = useState(concept?.title ?? '');
  const [description, setDescription] = useState(concept?.description ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const busy = progress !== null;
  const titleError = tried && !title.trim() ? t('concepts.errTitle') : '';

  const submit = async () => {
    setTried(true);
    setError('');
    if (!title.trim()) return;
    if (!editing) {
      const problem = validateConceptFiles(files);
      if (problem) { setError(problem); return; }
    }
    setProgress(0);
    try {
      const saved = editing
        ? await conceptApi.update(concept.id, { title: title.trim(), description: description.trim() || null })
        : await conceptApi.create(projectId, { title: title.trim(), description: description.trim() }, files, setProgress);
      onSaved(saved);
    } catch (e) {
      setError(conceptErrorText(e));
      setProgress(null);
    }
  };

  return (
    <Modal title={t(editing ? 'concepts.editTitle' : 'concepts.createTitle')} size="md" onClose={busy ? () => undefined : onClose} footer={<>
      <Button disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} onClick={() => void submit()}>
        {busy && !editing ? t('concepts.uploading', { pct: Math.round((progress ?? 0) * 100) }) : t(editing ? 'concepts.save' : 'concepts.create')}
      </Button>
    </>}>
      <div className="space-y-4">
        <Field label={t('concepts.titleLabel')} error={titleError}>
          {(f) => <Input {...f} value={title} maxLength={CONCEPT_TITLE_MAX} disabled={busy} invalid={!!titleError}
            placeholder={t('concepts.titlePlaceholder')} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field label={t('concepts.descriptionLabel')} hint={t('concepts.descriptionHint')} optional>
          {(f) => <Textarea {...f} rows={4} value={description} maxLength={CONCEPT_DESCRIPTION_MAX} disabled={busy}
            onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        {!editing && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-slate-700">{t('concepts.imagesLabel')}</p>
            <ImagePicker files={files} onChange={setFiles} disabled={busy} onError={setError} />
          </div>
        )}
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
