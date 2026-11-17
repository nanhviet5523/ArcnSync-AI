import { useEffect, useState } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { errorText, fieldErrorsText, t } from '@/i18n';
import { ApiError } from '@/services/authService';
import { designStyleService } from '@/services/designStyleService';
import type { DesignStyle } from '@/services/designStyleService';
import { updateProject } from './projectApi';
import type { Project, UpdateProjectPayload } from './projectApi';
import type { ContractToast } from './CreateContractModal';

const TOASTS: Record<string, string> = {
  PROJECT_NOT_EDITABLE: 'editProject.notEditable',
  INVALID_BUDGET_RANGE: 'editProject.budgetRange',
  DESIGN_STYLE_INACTIVE: 'editProject.styleInactive',
  DESIGN_STYLE_NOT_FOUND: 'editProject.styleNotFound',
  PROJECT_NOT_FOUND: 'editProject.notFound',
  INSUFFICIENT_ROLE: 'editProject.forbidden',
};

/** "150000000.00" → "150000000" for a number input. */
const whole = (v: string | null | undefined) => (v ? String(Math.round(Number(v))) : '');

/** Staff in charge / Admin edits a DRAFT project (PATCH /projects/:id). Only changed fields are sent. */
export function EditProjectModal({ project, onClose, onSaved, onToast }: {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
  onToast: (toast: ContractToast) => void;
}) {
  const initial = {
    title: project.title,
    description: project.description ?? '',
    householdSize: project.householdSize != null ? String(project.householdSize) : '',
    preferredStyleId: project.preferredStyle?.id ?? '',
    budgetMin: whole(project.budgetMin),
    budgetMax: whole(project.budgetMax),
    budgetTolerancePercent: project.budgetTolerancePercent != null ? String(Number(project.budgetTolerancePercent)) : '',
  };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [styles, setStyles] = useState<DesignStyle[]>([]);

  // Active styles for the dropdown; the form still works if this fails.
  useEffect(() => {
    let cancelled = false;
    designStyleService.getAll(true)
      .then((list) => { if (!cancelled) setStyles(list.filter((x) => x.isActive)); })
      .catch(() => { if (!cancelled) setStyles([]); });
    return () => { cancelled = true; };
  }, []);

  const set = (key: keyof typeof initial) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const budgetOrderError = form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax) ? t('newProject.budgetOrder') : '';

  const submit = async () => {
    const local: Record<string, string> = {};
    if (!form.title.trim()) local.title = t('common.required');
    if (!form.budgetMin) local.budgetMin = t('common.required');
    if (!form.budgetMax) local.budgetMax = t('common.required');
    if (form.householdSize && !(Number.isInteger(Number(form.householdSize)) && Number(form.householdSize) >= 1 && Number(form.householdSize) <= 50)) local.householdSize = t('newProject.householdSizeHint');
    if (form.budgetTolerancePercent && !(Number(form.budgetTolerancePercent) >= 0 && Number(form.budgetTolerancePercent) <= 10)) local.budgetTolerancePercent = t('editProject.toleranceHint');
    setErrors(local);
    if (Object.keys(local).length || budgetOrderError) return;

    const payload: UpdateProjectPayload = {};
    if (form.title.trim() !== initial.title) payload.title = form.title.trim();
    if (form.description.trim() !== initial.description) payload.description = form.description.trim() || null;
    if (form.householdSize !== initial.householdSize) payload.householdSize = form.householdSize ? Number(form.householdSize) : null;
    if (form.preferredStyleId !== initial.preferredStyleId) payload.preferredStyleId = form.preferredStyleId || null;
    if (form.budgetMin !== initial.budgetMin) payload.budgetMin = form.budgetMin;
    if (form.budgetMax !== initial.budgetMax) payload.budgetMax = form.budgetMax;
    if (form.budgetTolerancePercent && form.budgetTolerancePercent !== initial.budgetTolerancePercent) payload.budgetTolerancePercent = Number(form.budgetTolerancePercent);
    if (Object.keys(payload).length === 0) { onClose(); return; }

    setBusy(true);
    try {
      await updateProject(project.id, payload);
      onToast({ tone: 'success', message: t('editProject.success') });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION_ERROR' && Object.keys(e.fieldErrors).length) {
        setErrors(fieldErrorsText(e.fieldErrors));
      } else {
        const key = e instanceof ApiError ? TOASTS[e.code] : undefined;
        onToast({ tone: 'error', message: key ? t(key) : errorText(e) });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      size="md"
      title={t('editProject.title')}
      onClose={() => { if (!busy) onClose(); }}
      footer={(
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={busy} onClick={() => void submit()}>{busy ? t('common.saving') : t('common.save')}</Button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('newProject.projectName')} error={errors.title} className="sm:col-span-2">
          {(f) => <Input {...f} maxLength={255} value={form.title} invalid={!!errors.title} onChange={set('title')} />}
        </Field>
        <Field label={t('newProject.budgetMin')} error={errors.budgetMin || budgetOrderError}>
          {(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={form.budgetMin} invalid={!!(errors.budgetMin || budgetOrderError)} onChange={set('budgetMin')} />}
        </Field>
        <Field label={t('newProject.budgetMax')} error={errors.budgetMax || budgetOrderError}>
          {(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={form.budgetMax} invalid={!!(errors.budgetMax || budgetOrderError)} onChange={set('budgetMax')} />}
        </Field>
        <Field label={t('editProject.tolerance')} hint={t('editProject.toleranceHint')} error={errors.budgetTolerancePercent}>
          {(f) => <Input {...f} type="number" inputMode="decimal" min={0} max={10} step={0.5} value={form.budgetTolerancePercent} invalid={!!errors.budgetTolerancePercent} onChange={set('budgetTolerancePercent')} />}
        </Field>
        <Field label={t('newProject.householdSize')} hint={t('newProject.householdSizeNote')} optional error={errors.householdSize}>
          {(f) => <Input {...f} type="number" inputMode="numeric" min={1} max={50} value={form.householdSize} invalid={!!errors.householdSize} onChange={set('householdSize')} />}
        </Field>
        <Field label={t('newProject.style')} optional error={errors.preferredStyleId} className="sm:col-span-2">
          {(f) => (
            <Select {...f} value={form.preferredStyleId} invalid={!!errors.preferredStyleId} onChange={set('preferredStyleId')}>
              <option value="">{t('newProject.noStyle')}</option>
              {styles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              {/* the current style stays listed even if it is no longer active */}
              {project.preferredStyle && !styles.some((x) => x.id === project.preferredStyle?.id) && (
                <option value={project.preferredStyle.id}>{project.preferredStyle.name}</option>
              )}
            </Select>
          )}
        </Field>
        <Field label={t('newProject.description2')} optional error={errors.description} className="sm:col-span-2">
          {(f) => <Textarea {...f} rows={3} maxLength={5000} value={form.description} invalid={!!errors.description} onChange={set('description')} />}
        </Field>
      </div>
    </Modal>
  );
}
