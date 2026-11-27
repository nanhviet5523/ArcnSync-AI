import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { t } from '@/i18n';
import type { PropertyType } from '@/services/apartmentService';
import { MAX_FLOORS, siteSurveyApi, surveyErrorText, surveyFieldErrors } from './siteSurveyApi';
import type { MeasurementPayload, SiteSurvey } from './siteSurveyApi';

interface RoomForm { key: number; name: string; roomType: string; area: string; purpose: string; nameTouched: boolean }
interface FloorForm { key: number; level: string; name: string; height: string; area: string; note: string; rooms: RoomForm[] }

const INT = /^-?\d+$/;
const AREA = /^\d+(\.\d{1,2})?$/;
/** Same as the backend (SurveyFloorDto.measuredArea, SurveyRoomDto.area): 1 to 999999 m², at most 2 decimals. */
const MIN_AREA = 1;
const intIn = (raw: string, min: number, max: number) => INT.test(raw.trim()) && Number(raw) >= min && Number(raw) <= max;
const areaOk = (raw: string) => AREA.test(raw.trim()) && Number(raw) >= MIN_AREA && Number(raw) <= 999999;
/** Backend field names of the measurement body → this form's field names. */
const HOME_FIELDS = ['buildingName', 'address', 'tower', 'unitNo', 'floorNo', 'layoutCode', 'note'];
const FLOOR_FIELDS: Record<string, string> = { level: 'level', name: 'name', floorHeightMm: 'height', measuredArea: 'area', note: 'note' };
const ROOM_FIELDS = ['name', 'roomType', 'area', 'purpose'];
/** React keys for floor and room rows; only needs to be unique while the dialog is open. */
let seq = 0;
const nextKey = () => ++seq;

/**
 * Lead records the survey result (PUT /site-surveys/:id/measurement replaces it all): home details and each measured
 * floor with its rooms. Bedroom and bathroom totals are derived from those room entries. Photos are added after saving.
 */
export function MeasurementModal({ survey, onClose, onSaved }: { survey: SiteSurvey; onClose: () => void; onSaved: (survey: SiteSurvey) => void }) {
  const [home, setHome] = useState({
    propertyType: survey.propertyType,
    buildingName: survey.buildingName,
    address: survey.address,
    tower: survey.tower ?? '',
    unitNo: survey.unitNo,
    floorNo: survey.floorNo == null ? '' : String(survey.floorNo),
    layoutCode: survey.layoutCode ?? '',
    note: survey.leadNote ?? '',
  });
  const [floors, setFloors] = useState<FloorForm[]>(() => (survey.floors.length
    ? survey.floors.map((f) => ({
      key: nextKey(), level: String(f.level), name: f.name, height: String(f.floorHeightMm), area: String(Number(f.measuredArea)), note: f.note ?? '',
      rooms: f.rooms.map((r) => ({ key: nextKey(), name: r.name, roomType: r.roomType, area: r.area == null ? '' : String(Number(r.area)), purpose: r.purpose ?? '', nameTouched: true })),
    }))
    : [{ key: nextKey(), level: '1', name: 'Floor 1', height: '3000', area: '', note: '', rooms: [] }]));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  /** Floor row waiting for "remove anyway": removing it would delete saved photos. */
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);
  const isHouse = home.propertyType === 'HOUSE';

  const setH = (key: keyof typeof home, value: string) => { setHome((h) => ({ ...h, [key]: value })); setErrors((e) => ({ ...e, [key]: '' })); };
  const patchFloor = (fk: number, patch: Partial<FloorForm>) => setFloors((list) => list.map((f) => (f.key === fk ? { ...f, ...patch } : f)));
  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  /** Flags a wrong area as soon as the field loses focus (an empty one waits for Save). */
  const checkArea = (key: string, raw: string) => { if (raw.trim() && !areaOk(raw)) setErrors((e) => ({ ...e, [key]: t('siteSurvey.v.area') })); };

  const addFloor = () => setFloors((list) => {
    const levels = list.map((f) => Number(f.level)).filter((n) => Number.isFinite(n));
    const level = levels.length ? Math.max(...levels) + 1 : 1;
    return [...list, { key: nextKey(), level: String(level), name: `Floor ${level}`, height: '3000', area: '', note: '', rooms: [] }];
  });
  // Floors that already have photos and would lose them: their level is no longer in the list.
  const photoLoss = useMemo(() => {
    const levels = new Set(floors.map((f) => f.level.trim()).filter((l) => INT.test(l)).map(Number));
    return survey.floors.filter((f) => f.photos.length && !levels.has(f.level)).map((f) => f.name);
  }, [floors, survey.floors]);

  /** Saved photos the row holds: those of the saved floor at its level, unless another row keeps that level. */
  const photosHeldBy = (row: FloorForm) => {
    const level = row.level.trim();
    if (!INT.test(level)) return 0;
    if (floors.some((f) => f.key !== row.key && f.level.trim() !== '' && Number(f.level) === Number(level))) return 0;
    return survey.floors.find((f) => f.level === Number(level))?.photos.length ?? 0;
  };
  const removeFloor = (row: FloorForm) => {
    if (confirmRemove !== row.key && photosHeldBy(row) > 0) { setConfirmRemove(row.key); return; }
    setConfirmRemove(null);
    setFloors((list) => list.filter((x) => x.key !== row.key));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const req = t('siteSurvey.v.required');
    const text = (key: string, value: string, max: number, required: boolean) => {
      const v = value.trim();
      if (required && !v) e[key] = req;
      else if (v.length > max) e[key] = t('siteSurvey.v.tooLong', { max });
    };
    text('buildingName', home.buildingName, 200, true);
    text('address', home.address, 500, true);
    text('unitNo', home.unitNo, 50, true);
    if (!isHouse) { text('tower', home.tower, 50, false); text('layoutCode', home.layoutCode, 50, false); }
    text('note', home.note, 2000, false);
    if (home.floorNo.trim() && !intIn(home.floorNo, -10, 200)) e.floorNo = t('siteSurvey.v.int', { min: -10, max: 200 });
    const seenLevels = new Set<string>();
    for (const f of floors) {
      const k = `f${f.key}`;
      if (!f.level.trim()) e[`${k}.level`] = req;
      else if (!intIn(f.level, -5, 200)) e[`${k}.level`] = t('siteSurvey.v.int', { min: -5, max: 200 });
      else if (seenLevels.has(String(Number(f.level)))) e[`${k}.level`] = t('siteSurvey.v.dupLevel');
      else seenLevels.add(String(Number(f.level)));
      text(`${k}.name`, f.name, 100, true);
      if (f.height.trim() && !intIn(f.height, 1000, 20000)) e[`${k}.height`] = t('siteSurvey.v.int', { min: 1000, max: 20000 });
      if (!f.area.trim()) e[`${k}.area`] = req;
      else if (!areaOk(f.area)) e[`${k}.area`] = t('siteSurvey.v.area');
      text(`${k}.note`, f.note, 1000, false);
      const seenNames = new Set<string>();
      for (const r of f.rooms) {
        const rk = `r${r.key}`;
        const name = r.name.trim().toLowerCase();
        text(`${rk}.name`, r.name, 100, true);
        if (name && seenNames.has(name)) e[`${rk}.name`] = t('siteSurvey.v.dupRoom');
        seenNames.add(name);
        if (!r.roomType) e[`${rk}.roomType`] = req;
        if (r.area.trim() && !areaOk(r.area)) e[`${rk}.area`] = t('siteSurvey.v.area');
        text(`${rk}.purpose`, r.purpose, 255, false);
      }
    }
    return e;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const problems = validate();
    setErrors(problems);
    if (Object.keys(problems).length) { setFormError(t('siteSurvey.v.fix')); return; }
    const opt = (v: string) => (v.trim() ? v.trim() : undefined);
    const body: MeasurementPayload = {
      propertyType: home.propertyType,
      buildingName: home.buildingName.trim(),
      address: home.address.trim(),
      unitNo: home.unitNo.trim(),
      ...(!isHouse && opt(home.tower) ? { tower: opt(home.tower) } : {}),
      ...(home.floorNo.trim() ? { floorNo: Number(home.floorNo) } : {}),
      ...(!isHouse && opt(home.layoutCode) ? { layoutCode: opt(home.layoutCode) } : {}),
      ...(opt(home.note) ? { note: opt(home.note) } : {}),
      floors: floors.map((f) => ({
        level: Number(f.level),
        name: f.name.trim(),
        measuredArea: Number(f.area),
        ...(f.height.trim() ? { floorHeightMm: Number(f.height) } : {}),
        ...(opt(f.note) ? { note: opt(f.note) } : {}),
        rooms: f.rooms.map((r) => ({
          name: r.name.trim(),
          roomType: r.roomType,
          ...(r.area.trim() ? { area: Number(r.area) } : {}),
          ...(opt(r.purpose) ? { purpose: opt(r.purpose) } : {}),
        })),
      })),
    };
    setSaving(true);
    try { onSaved(await siteSurveyApi.recordMeasurement(survey.id, body)); }
    catch (e) {
      const server = surveyFieldErrors(e, (path) => {
        const parts = path.split('.');
        if (parts.length === 1) return HOME_FIELDS.includes(path) && !(isHouse && (path === 'tower' || path === 'layoutCode')) ? path : undefined;
        if (parts[0] !== 'floors') return undefined;
        const floor = floors[Number(parts[1])];
        if (!floor) return undefined;
        if (parts.length === 3) return FLOOR_FIELDS[parts[2]] ? `f${floor.key}.${FLOOR_FIELDS[parts[2]]}` : undefined;
        const room = parts[2] === 'rooms' ? floor.rooms[Number(parts[3])] : undefined;
        return room && parts.length === 5 && ROOM_FIELDS.includes(parts[4]) ? `r${room.key}.${parts[4]}` : undefined;
      });
      if (server) { setErrors(server.fields); setFormError(server.formError); }
      else setFormError(surveyErrorText(e));
    }
    finally { setSaving(false); }
  };

  return (
    <Modal size="lg" title={t('siteSurvey.measure.title')} onClose={onClose}
      footer={<>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" type="submit" form="survey-measure" loading={saving}>{t('siteSurvey.measure.save')}</Button>
      </>}>
      <form id="survey-measure" onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
        {formError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}

        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-ink">{t('siteSurvey.measure.home')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('siteSurvey.booking.propertyType')}>
              {(p) => <Select {...p} value={home.propertyType} onChange={(e) => setH('propertyType', e.target.value as PropertyType)}>
                <option value="APARTMENT">{t('projectDetail.propertyType.APARTMENT')}</option>
                <option value="HOUSE">{t('projectDetail.propertyType.HOUSE')}</option>
              </Select>}
            </Field>
            <Field label={t(isHouse ? 'siteSurvey.booking.buildingHouse' : 'siteSurvey.booking.building')} error={errors.buildingName}>
              {(p) => <Input {...p} maxLength={200} value={home.buildingName} invalid={!!errors.buildingName} onChange={(e) => setH('buildingName', e.target.value)} />}
            </Field>
            <Field label={t('siteSurvey.booking.address')} error={errors.address} className="sm:col-span-2">
              {(p) => <Input {...p} maxLength={500} value={home.address} invalid={!!errors.address} onChange={(e) => setH('address', e.target.value)} />}
            </Field>
            {!isHouse && (
              <Field label={t('siteSurvey.booking.tower')} optional error={errors.tower}>
                {(p) => <Input {...p} maxLength={50} value={home.tower} invalid={!!errors.tower} onChange={(e) => setH('tower', e.target.value)} />}
              </Field>
            )}
            <Field label={t(isHouse ? 'siteSurvey.booking.unitHouse' : 'siteSurvey.booking.unit')} error={errors.unitNo}>
              {(p) => <Input {...p} maxLength={50} value={home.unitNo} invalid={!!errors.unitNo} onChange={(e) => setH('unitNo', e.target.value)} />}
            </Field>
            <Field label={t('siteSurvey.booking.floorNo')} optional error={errors.floorNo}>
              {(p) => <Input {...p} type="number" min={-10} max={200} value={home.floorNo} invalid={!!errors.floorNo} onChange={(e) => setH('floorNo', e.target.value)} />}
            </Field>
            {!isHouse && (
              <Field label={t('siteSurvey.measure.layoutCode')} optional error={errors.layoutCode}>
                {(p) => <Input {...p} maxLength={50} placeholder="e.g. 2PN-A1" value={home.layoutCode} invalid={!!errors.layoutCode} onChange={(e) => setH('layoutCode', e.target.value)} />}
              </Field>
            )}
            <Field label={t('siteSurvey.measure.note')} optional error={errors.note} className="sm:col-span-2">
              {(p) => <Textarea {...p} rows={2} maxLength={2000} value={home.note} invalid={!!errors.note} onChange={(e) => setH('note', e.target.value)} />}
            </Field>
          </div>
        </section>

        <section>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-ink">{t('siteSurvey.measure.floors')}</h3>
            <Button size="sm" disabled={floors.length >= MAX_FLOORS} onClick={addFloor}>+ {t('siteSurvey.measure.addFloor')}</Button>
          </div>
          <p className="mb-3 text-xs text-slate-500">{t('siteSurvey.measure.floorsHint')}</p>
          {photoLoss.length > 0 && <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('siteSurvey.measure.photoLoss', { floors: photoLoss.join(', ') })}</p>}

          <div className="space-y-4">
            {floors.map((f) => {
              const k = `f${f.key}`;
              return (
                <fieldset key={f.key} className="rounded-xl border border-line p-4">
                  <legend className="px-1 text-sm font-semibold text-ink">{f.name || t('siteSurvey.measure.floorName')}</legend>
                  <div className="grid gap-3 sm:grid-cols-[6rem_1fr_8rem_9rem]">
                    <Field label={t('siteSurvey.measure.level')} error={errors[`${k}.level`]}>
                      {(p) => <Input {...p} type="number" min={-5} max={200} value={f.level} invalid={!!errors[`${k}.level`]} onChange={(e) => { patchFloor(f.key, { level: e.target.value }); clear(`${k}.level`); }} />}
                    </Field>
                    <Field label={t('siteSurvey.measure.floorName')} error={errors[`${k}.name`]}>
                      {(p) => <Input {...p} maxLength={100} value={f.name} invalid={!!errors[`${k}.name`]} onChange={(e) => { patchFloor(f.key, { name: e.target.value }); clear(`${k}.name`); }} />}
                    </Field>
                    <Field label={t('siteSurvey.measure.height')} error={errors[`${k}.height`]}>
                      {(p) => <Input {...p} type="number" min={1000} max={20000} step={10} value={f.height} invalid={!!errors[`${k}.height`]} onChange={(e) => { patchFloor(f.key, { height: e.target.value }); clear(`${k}.height`); }} />}
                    </Field>
                    <Field label={t('siteSurvey.measure.area')} error={errors[`${k}.area`]}>
                      {(p) => <Input {...p} type="number" min={MIN_AREA} step={0.01} value={f.area} invalid={!!errors[`${k}.area`]} onBlur={(e) => checkArea(`${k}.area`, e.target.value)} onChange={(e) => { patchFloor(f.key, { area: e.target.value }); clear(`${k}.area`); }} />}
                    </Field>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t('siteSurvey.measure.levelHint')}</p>
                  <Field label={t('siteSurvey.measure.floorNote')} optional error={errors[`${k}.note`]} className="mt-3">
                    {(p) => <Input {...p} maxLength={1000} value={f.note} invalid={!!errors[`${k}.note`]} onChange={(e) => { patchFloor(f.key, { note: e.target.value }); clear(`${k}.note`); }} />}
                  </Field>

                  {floors.length > 1 && (confirmRemove === f.key ? (
                    <div role="alert" className="mt-3 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="mr-auto text-xs text-rose-800">
                        {t('siteSurvey.measure.removeFloorPhotos', { name: f.name || t('siteSurvey.measure.floorName'), n: photosHeldBy(f) })}
                      </p>
                      <Button size="sm" autoFocus onClick={() => setConfirmRemove(null)}>{t('siteSurvey.measure.keepFloor')}</Button>
                      <Button size="sm" variant="danger" onClick={() => removeFloor(f)}>{t('siteSurvey.measure.removeAnyway')}</Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => removeFloor(f)}>
                        {t('siteSurvey.measure.removeFloor', { name: f.name || t('siteSurvey.measure.floorName') })}
                      </Button>
                    </div>
                  ))}
                </fieldset>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">{t('siteSurvey.measure.photosAfterSave')}</p>
        </section>
      </form>
    </Modal>
  );
}
