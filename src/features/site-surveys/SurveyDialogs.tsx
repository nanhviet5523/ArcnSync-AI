import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { t } from '@/i18n';
import type { PropertyType } from '@/services/apartmentService';
import { MAX_SLOTS, siteSurveyApi, surveyErrorText } from './siteSurveyApi';
import type { SchedulePayload, SiteSurvey, UpdateSurveyPayload } from './siteSurveyApi';
import { blankSlot, isPast, localDate, sameSlots, slotLabel, toSlot, toSlotForm } from './surveyTime';
import type { SlotForm } from './surveyTime';

/** Same rules as the backend: filled in, in the future, end after start, no time twice. */
function slotError(f: SlotForm, all: SlotForm[], index: number): string {
  if (!f.date || !f.from || !f.to) return t('siteSurvey.v.required');
  const s = toSlot(f);
  if (new Date(s.startAt).getTime() <= Date.now()) return t('siteSurvey.v.slotPast');
  if (new Date(s.endAt) <= new Date(s.startAt)) return t('siteSurvey.v.slotOrder');
  if (all.slice(0, index).some((o) => o.date === f.date && o.from === f.from && o.to === f.to)) return t('siteSurvey.v.slotDuplicate');
  return '';
}

function SlotRow({ value, onChange, error, label, onRemove, removeLabel }: {
  value: SlotForm; onChange: (v: SlotForm) => void; error?: string; label: string; onRemove?: () => void; removeLabel?: string;
}) {
  const [today] = useState(() => localDate(new Date()));
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-[13px] font-medium text-slate-700">{label}</legend>
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
        <Field label={t('siteSurvey.booking.date')} className="col-span-3 sm:col-span-1">
          {(p) => <Input {...p} type="date" min={today} value={value.date} invalid={!!error} onChange={(e) => onChange({ ...value, date: e.target.value })} />}
        </Field>
        <Field label={t('siteSurvey.booking.from')}>
          {(p) => <Input {...p} type="time" step={900} value={value.from} invalid={!!error} onChange={(e) => onChange({ ...value, from: e.target.value })} />}
        </Field>
        <Field label={t('siteSurvey.booking.to')}>
          {(p) => <Input {...p} type="time" step={900} value={value.to} invalid={!!error} onChange={(e) => onChange({ ...value, to: e.target.value })} />}
        </Field>
        {onRemove && <Button variant="ghost" size="sm" aria-label={removeLabel} onClick={onRemove} className="mb-0.5">✕</Button>}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </fieldset>
  );
}

const FormError = ({ message }: { message: string }) =>
  message ? <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p> : null;

// ---------------------------------------------------------------------------
// Homeowner: book a survey, or change the booking (times / address) while REQUESTED | SCHEDULED.
// ---------------------------------------------------------------------------

export function BookingModal({ projectId, survey, onClose, onSaved }: {
  projectId: string;
  /** Present = change this booking (PATCH); absent = book a new one (POST). */
  survey?: SiteSurvey;
  onClose: () => void;
  onSaved: (survey: SiteSurvey) => void;
}) {
  const editing = !!survey;
  const [slots, setSlots] = useState<SlotForm[]>(() => (survey ? survey.proposedSlots.map(toSlotForm) : [blankSlot()]));
  const [form, setForm] = useState({
    propertyType: (survey?.propertyType ?? 'APARTMENT') as PropertyType,
    buildingName: survey?.buildingName ?? '',
    address: survey?.address ?? '',
    tower: survey?.tower ?? '',
    unitNo: survey?.unitNo ?? '',
    floorNo: survey?.floorNo == null ? '' : String(survey.floorNo),
    note: survey?.customerNote ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const isHouse = form.propertyType === 'HOUSE';
  const set = (key: keyof typeof form, value: string) => { setForm((f) => ({ ...f, [key]: value })); setErrors((e) => ({ ...e, [key]: '' })); };

  const slotsChanged = !survey || !sameSlots(slots.every((s) => s.date && s.from && s.to) ? slots.map(toSlot) : [], survey.proposedSlots);

  const validate = () => {
    const e: Record<string, string> = {};
    // Unchanged times of an existing booking are not sent again, so they may already be in the past.
    if (slotsChanged) slots.forEach((s, i) => { const m = slotError(s, slots, i); if (m) e[`slot${i}`] = m; });
    const text = (key: keyof typeof form, max: number, required: boolean) => {
      const v = form[key].trim();
      if (required && !v) e[key] = t('siteSurvey.v.required');
      else if (v.length > max) e[key] = t('siteSurvey.v.tooLong', { max });
    };
    text('buildingName', 200, true);
    text('address', 500, true);
    text('unitNo', 50, true);
    if (!isHouse) text('tower', 50, false);
    text('note', 1000, false);
    if (form.floorNo.trim() && !(/^-?\d+$/.test(form.floorNo.trim()) && Number(form.floorNo) >= -10 && Number(form.floorNo) <= 200)) e.floorNo = t('siteSurvey.v.int', { min: -10, max: 200 });
    return e;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const problems = validate();
    setErrors(problems);
    if (Object.values(problems).some(Boolean)) { setFormError(t('siteSurvey.v.fix')); return; }
    setSaving(true);
    try {
      const tower = !isHouse && form.tower.trim() ? form.tower.trim() : null;
      const floorNo = form.floorNo.trim() ? Number(form.floorNo) : null;
      const note = form.note.trim() || null;
      const base = { propertyType: form.propertyType, buildingName: form.buildingName.trim(), address: form.address.trim(), unitNo: form.unitNo.trim() };
      let saved: SiteSurvey;
      if (survey) {
        const patch: UpdateSurveyPayload = { ...base, tower, floorNo, note, ...(slotsChanged ? { proposedSlots: slots.map(toSlot) } : {}) };
        saved = await siteSurveyApi.update(survey.id, patch);
      } else {
        saved = await siteSurveyApi.book(projectId, {
          ...base, proposedSlots: slots.map(toSlot),
          ...(tower ? { tower } : {}), ...(floorNo !== null ? { floorNo } : {}), ...(note ? { note } : {}),
        });
      }
      onSaved(saved);
    } catch (e) {
      setFormError(surveyErrorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal size="lg" title={t(editing ? 'siteSurvey.booking.titleEdit' : 'siteSurvey.booking.titleNew')} onClose={onClose}
      footer={<>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" type="submit" form="survey-booking" loading={saving}>{t(editing ? 'common.save' : 'siteSurvey.booking.submitNew')}</Button>
      </>}>
      <form id="survey-booking" onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        <FormError message={formError} />
        <section>
          <h3 className="text-[13px] font-semibold text-slate-800">{t('siteSurvey.booking.slots')}</h3>
          <p className="mb-2 text-xs text-slate-500">{t('siteSurvey.booking.slotsHint')}</p>
          {editing && survey?.status === 'SCHEDULED' && <p className="mb-2 text-xs text-amber-700">{t('siteSurvey.booking.slotsChangedNote')}</p>}
          <div className="space-y-2">
            {slots.map((s, i) => (
              <SlotRow key={i} value={s} label={t('siteSurvey.booking.slot', { n: i + 1 })} error={errors[`slot${i}`]}
                onChange={(v) => { setSlots((list) => list.map((x, j) => (j === i ? v : x))); setErrors((e) => ({ ...e, [`slot${i}`]: '' })); }}
                onRemove={slots.length > 1 ? () => setSlots((list) => list.filter((_, j) => j !== i)) : undefined}
                removeLabel={t('siteSurvey.booking.removeSlot', { n: i + 1 })} />
            ))}
          </div>
          {slots.length < MAX_SLOTS && <Button size="sm" variant="ghost" className="mt-2" onClick={() => setSlots((list) => [...list, blankSlot()])}>+ {t('siteSurvey.booking.addSlot')}</Button>}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Field label={t('siteSurvey.booking.propertyType')}>
            {(p) => <Select {...p} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
              <option value="APARTMENT">{t('projectDetail.propertyType.APARTMENT')}</option>
              <option value="HOUSE">{t('projectDetail.propertyType.HOUSE')}</option>
            </Select>}
          </Field>
          <Field label={t(isHouse ? 'siteSurvey.booking.buildingHouse' : 'siteSurvey.booking.building')} error={errors.buildingName}>
            {(p) => <Input {...p} value={form.buildingName} maxLength={200} invalid={!!errors.buildingName} placeholder="e.g. Sunrise City" onChange={(e) => set('buildingName', e.target.value)} />}
          </Field>
          <Field label={t('siteSurvey.booking.address')} error={errors.address} className="sm:col-span-2">
            {(p) => <Input {...p} value={form.address} maxLength={500} invalid={!!errors.address} placeholder="Street, ward, district, city" onChange={(e) => set('address', e.target.value)} />}
          </Field>
          {!isHouse && (
            <Field label={t('siteSurvey.booking.tower')} optional error={errors.tower}>
              {(p) => <Input {...p} value={form.tower} maxLength={50} invalid={!!errors.tower} placeholder="e.g. S1.02" onChange={(e) => set('tower', e.target.value)} />}
            </Field>
          )}
          <Field label={t(isHouse ? 'siteSurvey.booking.unitHouse' : 'siteSurvey.booking.unit')} error={errors.unitNo}>
            {(p) => <Input {...p} value={form.unitNo} maxLength={50} invalid={!!errors.unitNo} placeholder={isHouse ? 'e.g. 88' : 'e.g. S1.02-1205'} onChange={(e) => set('unitNo', e.target.value)} />}
          </Field>
          <Field label={t('siteSurvey.booking.floorNo')} optional error={errors.floorNo}>
            {(p) => <Input {...p} type="number" min={-10} max={200} value={form.floorNo} invalid={!!errors.floorNo} placeholder="e.g. 12" onChange={(e) => set('floorNo', e.target.value)} />}
          </Field>
          <Field label={t('siteSurvey.booking.note')} optional error={errors.note} className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={3} maxLength={1000} value={form.note} invalid={!!errors.note} placeholder={t('siteSurvey.booking.notePlaceholder')} onChange={(e) => set('note', e.target.value)} />}
          </Field>
        </section>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Lead: pick one of the homeowner's times, or move the visit to another time.
// ---------------------------------------------------------------------------

export function ScheduleModal({ survey, onClose, onSaved }: { survey: SiteSurvey; onClose: () => void; onSaved: (survey: SiteSurvey) => void }) {
  const firstFuture = survey.proposedSlots.findIndex((s) => !isPast(s));
  const current = survey.scheduledSlot;
  const [choice, setChoice] = useState<number | 'other'>(() => {
    if (current && current.slotIndex !== null && !isPast(current)) return current.slotIndex;
    if (current && current.slotIndex === null) return 'other';
    return firstFuture >= 0 ? firstFuture : 'other';
  });
  const [other, setOther] = useState<SlotForm>(() => (current && current.slotIndex === null && !isPast(current) ? toSlotForm(current) : blankSlot()));
  const [otherError, setOtherError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    let body: SchedulePayload;
    if (choice === 'other') {
      const m = slotError(other, [other], 0);
      setOtherError(m);
      if (m) return;
      body = toSlot(other);
    } else body = { slotIndex: choice };
    setSaving(true);
    try { onSaved(await siteSurveyApi.schedule(survey.id, body)); }
    catch (e) { setFormError(surveyErrorText(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal size="md" title={t('siteSurvey.schedule.title')} onClose={onClose}
      footer={<>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" type="submit" form="survey-schedule" loading={saving}>{t('siteSurvey.schedule.save')}</Button>
      </>}>
      <form id="survey-schedule" onSubmit={(e) => void submit(e)} noValidate>
        <FormError message={formError} />
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[13px] font-medium text-slate-700">{t('siteSurvey.schedule.offered')}</legend>
          {survey.proposedSlots.map((slot, i) => (
            <label key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${isPast(slot) ? 'border-slate-100 text-slate-400' : 'cursor-pointer border-slate-200 text-slate-800 hover:bg-slate-50'}`}>
              <input type="radio" name="slot" className="accent-blue-600" disabled={isPast(slot)} checked={choice === i} onChange={() => setChoice(i)} />
              <span>{slotLabel(slot)}{isPast(slot) && <span className="ml-1.5 text-xs">({t('siteSurvey.schedule.past')})</span>}</span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50">
            <input type="radio" name="slot" className="accent-blue-600" checked={choice === 'other'} onChange={() => setChoice('other')} />
            {t('siteSurvey.schedule.other')}
          </label>
        </fieldset>
        {choice === 'other' && (
          <div className="mt-3">
            <SlotRow value={other} label={t('siteSurvey.schedule.other')} error={otherError} onChange={(v) => { setOther(v); setOtherError(''); }} />
          </div>
        )}
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Reason box for cancelling a survey or rejecting its result.
// ---------------------------------------------------------------------------

export function ReasonModal({ title, placeholder, confirmLabel, cancelLabel, danger, onClose, onSubmit }: {
  title: string; placeholder: string; confirmLabel: string; cancelLabel?: string; danger?: boolean;
  onClose: () => void;
  /** Throws to keep the dialog open with the error. */
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = reason.trim();
    if (!value) { setError(t('siteSurvey.v.required')); return; }
    setSaving(true);
    setFormError('');
    try { await onSubmit(value); }
    catch (e) { setFormError(surveyErrorText(e)); setSaving(false); }
  };
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <Button onClick={onClose}>{cancelLabel ?? t('common.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} type="submit" form="survey-reason" loading={saving}>{confirmLabel}</Button>
      </>}>
      <form id="survey-reason" onSubmit={(e) => void submit(e)} noValidate>
        <FormError message={formError} />
        <Field label={t('siteSurvey.reason.label')} error={error}>
          {(p) => <Textarea {...p} autoFocus rows={4} maxLength={1000} value={reason} invalid={!!error} placeholder={placeholder} onChange={(e) => { setReason(e.target.value); setError(''); }} />}
        </Field>
      </form>
    </Modal>
  );
}
