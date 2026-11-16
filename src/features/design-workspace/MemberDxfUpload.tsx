import { useState } from 'react';
import { Download } from 'lucide-react';
import { Banner, Button, Field, Modal, Select } from '@/components/ui';
import { errorText, t } from '@/i18n';
import { DIFF_COLORS, ignoredReasonText } from './logic';
import type { DiffKind } from './logic';
import type { AcceptedLayoutChange, IgnoredLayoutChange, LayoutOp } from './types';

const OP_KIND: Record<LayoutOp, DiffKind> = { ADD: 'added', DELETE: 'removed', MOVE: 'moved' };

/** "Added", "Removed", "Moved" with the Compare colour dot. */
export function OpTag({ op }: { op: LayoutOp }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-600">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: DIFF_COLORS[OP_KIND[op]] }} />
      {t(`drafts.op.${op}`)}
    </span>
  );
}

type UploadError = { status?: number; code?: string; fieldErrors?: Record<string, string>; details?: { currentVersionId?: string | null } };

/**
 * Member: upload the DXF they edited in AutoCAD. Only changes inside their rooms reach their drafts; no version is made.
 * `floors`: floors holding at least one of the Member's rooms. A floor picker shows only when there are several.
 */
export function MemberDxfUploadDialog({ floors, multiFloor, initialFloorId, onClose, onUpload, onDownload, onDownloadLatest, onForbidden }: {
  floors: { id: string; name: string }[];
  /** The version has more than one floor drawing: the backend needs floorId. */
  multiFloor: boolean;
  initialFloorId: string | null;
  onClose: () => void;
  onUpload: (file: File, floorId: string | null, onProgress: (f: number) => void) => Promise<void>;
  onDownload: (floorId: string | null) => void;
  /** VERSION_NOT_CURRENT: fetch the newest version's file and open that version. */
  onDownloadLatest: (versionId: string | null, floorId: string | null) => void;
  onForbidden: () => void;
}) {
  const [floorId, setFloorId] = useState<string | null>(floors.find((f) => f.id === initialFloorId)?.id ?? floors[0]?.id ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [latestId, setLatestId] = useState<string | null | undefined>(undefined);
  const [progress, setProgress] = useState<number | null>(null);
  const busy = progress !== null;

  const pick = (f: File | null) => {
    setError(''); setLatestId(undefined);
    if (f && !/\.dxf$/i.test(f.name)) { setFile(null); setFileError(t('drafts.errNotDxf')); return; }
    setFileError(''); setFile(f);
  };
  const submit = async () => {
    if (!file) { setFileError(t('drafts.errNotDxf')); return; }
    if (multiFloor && !floorId) { setError(t('drafts.errChooseFloor')); return; }
    setError(''); setLatestId(undefined); setProgress(0);
    try {
      await onUpload(file, multiFloor ? floorId : null, setProgress);
    } catch (e) {
      const err = e as UploadError;
      if (err.status === 403) { onForbidden(); return; }
      if (err.code === 'VERSION_NOT_CURRENT') { setLatestId(err.details?.currentVersionId ?? null); setError(t('drafts.errNewer')); }
      else if (err.fieldErrors?.floorId) setError(t('drafts.errChooseFloor'));
      else if (err.status === 400) setError(t('drafts.errInvalidDxf'));
      else setError(errorText(e));
    } finally { setProgress(null); }
  };
  const pct = Math.round((progress ?? 0) * 100);

  return (
    <Modal title={t('drafts.uploadDxf')} size="md" onClose={busy ? () => undefined : onClose} footer={<>
      <Button onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} disabled={!file} onClick={submit}>{t('drafts.upload')}</Button>
    </>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 px-3 py-2.5">
          <p className="min-w-0 flex-1 text-[13px] text-slate-700">{t('drafts.uploadHint')}</p>
          <Button size="sm" onClick={() => onDownload(floorId)} disabled={busy}><Download aria-hidden className="h-3.5 w-3.5" />{t('drafts.downloadDxf')}</Button>
        </div>
        {floors.length > 1 && (
          <Field label={t('drafts.floor')}>
            {(f) => (
              <Select {...f} value={floorId ?? ''} disabled={busy} onChange={(e) => { setFloorId(e.target.value || null); setError(''); }}>
                {floors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
            )}
          </Field>
        )}
        <Field label={t('drafts.dxfFile')} error={fileError}>
          {(f) => (
            <input {...f} type="file" accept=".dxf" disabled={busy} onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className="block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-slate-800 hover:file:bg-slate-200" />
          )}
        </Field>
        {busy && (
          <div role="status" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{pct < 100 ? t('drafts.uploading', { pct }) : t('drafts.reading')}</p>
          </div>
        )}
        {error && (
          <Banner tone="amber" action={latestId !== undefined ? <Button size="sm" onClick={() => onDownloadLatest(latestId, floorId)}><Download aria-hidden className="h-3.5 w-3.5" />{t('drafts.downloadDxf')}</Button> : undefined}>
            {error}
          </Banner>
        )}
      </div>
    </Modal>
  );
}

/** What an upload changed nothing about: item, room and why, in plain words. */
export function IgnoredList({ items, ownerOfRoom }: { items: readonly IgnoredLayoutChange[]; ownerOfRoom: (roomName: string | null) => string | null }) {
  return (
    <ul className="divide-y divide-amber-200/70">
      {items.map((i, n) => (
        <li key={`${i.handle ?? ''}-${n}`} className="py-1.5 text-[13px]">
          <span className="font-medium">{i.block_name ?? t('drafts.unnamedItem')}</span>
          <span className="text-amber-800"> · {ignoredReasonText(i.reason, i.room_name, i.reason === 'OUTSIDE_ASSIGNED_ROOMS' ? ownerOfRoom(i.room_name) : null)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Result of a DXF upload: accepted changes by room (click → zoom), then what was ignored and why. */
export function UploadResultModal({ title, accepted, ignored, nameOf, ownerOfRoom, onPick, onClose }: {
  title: string;
  accepted: readonly AcceptedLayoutChange[];
  ignored: readonly IgnoredLayoutChange[];
  nameOf: (a: AcceptedLayoutChange) => string;
  ownerOfRoom: (roomName: string | null) => string | null;
  onPick: (a: AcceptedLayoutChange) => void;
  onClose: () => void;
}) {
  const rooms = [...new Set(accepted.map((a) => a.room_name))];
  return (
    <Modal title={title} size="md" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>{t('common.close')}</Button>}>
      <div className="space-y-4">
        {accepted.length ? (
          <section>
            <h3 className="text-[13px] font-semibold text-slate-900">{t('drafts.accepted', { n: accepted.length, rooms: rooms.join(', ') })}</h3>
            {rooms.map((room) => (
              <div key={room} className="mt-2 rounded-lg border border-line">
                <p className="border-b border-line bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">{room}</p>
                <ul className="divide-y divide-line">
                  {accepted.filter((a) => a.room_name === room).map((a, i) => (
                    <li key={`${a.op}-${a.handle ?? i}`}>
                      <button type="button" onClick={() => onPick(a)}
                        className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
                        <span className="min-w-0 truncate text-[13px] text-slate-900">{nameOf(a)}</span>
                        <OpTag op={a.op} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : <p className="text-[13px] text-slate-600">{t('drafts.acceptedNone')}</p>}
        {!!ignored.length && (
          <Banner tone="amber">
            <p className="font-medium">{t('drafts.ignored', { n: ignored.length })}</p>
            <IgnoredList items={ignored} ownerOfRoom={ownerOfRoom} />
          </Banner>
        )}
      </div>
    </Modal>
  );
}
