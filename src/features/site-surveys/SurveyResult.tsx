import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button, DetailList, Modal } from '@/components/ui';
import { formatNumber, t } from '@/i18n';
import { roomTypeLabel } from './roomTypes';
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_FLOOR, MAX_PHOTOS_PER_UPLOAD, PHOTO_TYPES, siteSurveyApi, surveyErrorText } from './siteSurveyApi';
import type { SiteSurvey, SurveyFloor, SurveyPhoto } from './siteSurveyApi';

/** One photo, fetched with the bearer token and shown from an object URL. */
function PhotoThumb({ floorId, photo, onDelete }: { floorId: string; photo: SurveyPhoto; onDelete?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    siteSurveyApi.photoBlob(floorId, photo.id).then((blob) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }, () => alive && setFailed(true));
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [floorId, photo.id]);

  return (
    <li className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" aria-label={t('siteSurvey.openPhoto', { name: photo.fileName })}>
          <img src={url} alt={photo.fileName} className="h-full w-full object-cover" />
        </a>
      ) : failed ? (
        <span className="grid h-full place-items-center px-1 text-center text-[11px] text-slate-500">{t('siteSurvey.photoFailed')}</span>
      ) : <span aria-hidden className="block h-full w-full animate-pulse" />}
      {onDelete && (
        <button type="button" aria-label={t('siteSurvey.deletePhoto', { name: photo.fileName })} onClick={onDelete}
          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-xs font-bold text-rose-700 shadow hover:bg-white">
          ✕
        </button>
      )}
    </li>
  );
}

function FloorPhotos({ floor, editable, onChange, onMessage }: {
  floor: SurveyFloor; editable: boolean;
  onChange: (photos: SurveyPhoto[]) => void;
  onMessage: (tone: 'success' | 'error', message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const left = MAX_PHOTOS_PER_FLOOR - floor.photos.length;

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (!files.length) return;
    const bad = files.find((f) => !PHOTO_TYPES.includes(f.type) || f.size > MAX_PHOTO_BYTES);
    if (bad) { onMessage('error', t('siteSurvey.photoBadFile', { name: bad.name })); return; }
    if (files.length > left) { onMessage('error', t('siteSurvey.photoTooMany', { left })); return; }
    let photos = floor.photos;
    let added = 0;
    try {
      // the backend takes at most 10 files per request
      for (let i = 0; i < files.length; i += MAX_PHOTOS_PER_UPLOAD) {
        const chunk = files.slice(i, i + MAX_PHOTOS_PER_UPLOAD);
        setProgress(i / files.length);
        const created = await siteSurveyApi.uploadPhotos(floor.id, chunk, (f) => setProgress((i + f * chunk.length) / files.length));
        photos = [...photos, ...created];
        added += created.length;
        onChange(photos);
      }
      onMessage('success', t('siteSurvey.done.photosAdded', { n: added }));
    } catch (e) {
      onMessage('error', surveyErrorText(e));
    } finally {
      setProgress(null);
    }
  };

  /** Photo waiting for the "Delete photo?" answer. */
  const [pending, setPending] = useState<SurveyPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const remove = async (photo: SurveyPhoto) => {
    setDeleting(true);
    try {
      await siteSurveyApi.deletePhoto(floor.id, photo.id);
      onChange(floor.photos.filter((p) => p.id !== photo.id));
      onMessage('success', t('siteSurvey.done.photoDeleted'));
    } catch (e) {
      onMessage('error', surveyErrorText(e));
    } finally {
      setDeleting(false);
      setPending(null);
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-[13px] font-medium text-slate-700">
          {t('siteSurvey.photos')} <span className="font-normal text-slate-500">· {t('siteSurvey.photoCount', { n: floor.photos.length })}</span>
        </h5>
        {editable && (
          <>
            <input ref={input} type="file" multiple accept={PHOTO_TYPES.join(',')} className="hidden" onChange={(e) => void upload(e)} />
            <Button size="sm" disabled={progress !== null || left <= 0} onClick={() => input.current?.click()}>
              {progress !== null ? t('siteSurvey.uploading', { pct: Math.round(progress * 100) }) : `+ ${t('siteSurvey.addPhotos')}`}
            </Button>
          </>
        )}
      </div>
      {floor.photos.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {floor.photos.map((p) => <PhotoThumb key={p.id} floorId={floor.id} photo={p} onDelete={editable ? () => setPending(p) : undefined} />)}
        </ul>
      ) : <p className={`text-xs ${editable ? 'text-amber-700' : 'text-slate-500'}`}>{editable ? t('siteSurvey.photosNeeded') : t('siteSurvey.noPhotos')}</p>}
      {editable && <p className="mt-1.5 text-[11px] text-slate-500">{t('siteSurvey.photoHint', { max: MAX_PHOTOS_PER_FLOOR })}</p>}
      {pending && (
        <Modal title={t('siteSurvey.deletePhotoTitle')} onClose={() => !deleting && setPending(null)}
          footer={<>
            <Button disabled={deleting} onClick={() => setPending(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={deleting} onClick={() => void remove(pending)}>{t('siteSurvey.deletePhotoConfirm')}</Button>
          </>}>
          <p className="text-sm text-slate-700">{t('siteSurvey.deletePhotoBody', { name: pending.fileName, floor: floor.name })}</p>
        </Modal>
      )}
    </div>
  );
}

/** Measured home details and every floor with its rooms and photos. The Lead can add and delete photos while `photosEditable`. */
export function SurveyResult({ survey, photosEditable, onFloorPhotos, onMessage }: {
  survey: SiteSurvey;
  photosEditable: boolean;
  onFloorPhotos: (floorId: string, photos: SurveyPhoto[]) => void;
  onMessage: (tone: 'success' | 'error', message: string) => void;
}) {
  if (!survey.floors.length) return <p className="text-sm text-slate-500">{t('siteSurvey.noResult')}</p>;
  const total = survey.measuredTotalArea ?? survey.floors.reduce((sum, f) => sum + Number(f.measuredArea), 0).toFixed(2);
  return (
    <div>
      <DetailList items={[
        { label: t('siteSurvey.totalArea'), value: t('projectDetail.areaValue', { area: formatNumber(total) }) },
        ...(survey.bedroomCount != null && survey.bathroomCount != null ? [{ label: t('siteSurvey.rooms'), value: `${survey.bedroomCount} · ${survey.bathroomCount}` }] : []),
        ...(survey.layoutCode ? [{ label: t('siteSurvey.layoutCode'), value: survey.layoutCode }] : []),
        ...(survey.leadNote ? [{ label: t('siteSurvey.leadNote'), value: <span className="whitespace-pre-line">{survey.leadNote}</span> }] : []),
      ]} />
      <div className="mt-4 space-y-3">
        {survey.floors.map((f) => (
          <section key={f.id} className="rounded-xl border border-slate-200 p-4">
            <h4 className="text-sm font-semibold text-slate-900">{f.name}</h4>
            <p className="text-xs text-slate-500">{t('siteSurvey.floorMeta', { level: f.level, area: formatNumber(f.measuredArea), height: formatNumber(f.floorHeightMm) })}</p>
            {f.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{f.note}</p>}
            {f.rooms.length ? (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="py-1.5 font-medium">{t('siteSurvey.measure.roomName')}</th>
                    <th className="py-1.5 font-medium">{t('siteSurvey.measure.roomType')}</th>
                    <th className="py-1.5 text-right font-medium">{t('siteSurvey.measure.roomArea')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {f.rooms.map((r) => (
                    <tr key={r.name}>
                      <td className="py-2 text-slate-800">{r.name}{r.purpose && <span className="block text-xs text-slate-500">{r.purpose}</span>}</td>
                      <td className="py-2 text-slate-600">{roomTypeLabel(r.roomType)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-600">{r.area ? t('siteSurvey.roomArea', { area: formatNumber(r.area) }) : t('common.none')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="mt-2 text-xs text-slate-500">{t('siteSurvey.noRooms')}</p>}
            <FloorPhotos floor={f} editable={photosEditable} onChange={(photos) => onFloorPhotos(f.id, photos)} onMessage={onMessage} />
          </section>
        ))}
      </div>
    </div>
  );
}
