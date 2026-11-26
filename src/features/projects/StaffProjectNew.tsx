import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, Button, Card, DetailList, ErrorState, Field, Input, PageHeader, Select, Stepper, Textarea } from '@/components/ui';
import { errorText, fieldErrorsText, formatMoney, t, tList } from '@/i18n';
import { ApiError } from '@/services/authService';
import { designStyleService } from '@/services/designStyleService';
import type { DesignStyle } from '@/services/designStyleService';
import { projectApi } from './projectApi';
import { PendingSurvey } from './ProjectInfoSections';

type Customer = { id: string; email: string; fullName: string; phone: string };
type Errors = Record<string, string>;
const blankProject = { title: '', budgetMin: '', budgetMax: '', description: '', householdSize: '', preferredStyleId: '' };
type Toast = { tone: 'success' | 'warning' | 'error'; message: string };

/**
 * Staff: create a project in two steps, customer (by email) then project details. POST /projects takes the
 * customerEmail; the home is attached later, once the site survey is confirmed.
 */
export function StaffProjectNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [project, setProject] = useState(blankProject);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [styles, setStyles] = useState<DesignStyle[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast || toast.tone === 'success') return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Active design styles for the optional style dropdown; the form still works if this fails.
  useEffect(() => {
    let cancelled = false;
    designStyleService.getAll(true)
      .then((list) => { if (!cancelled) setStyles(list.filter((x) => x.isActive)); })
      .catch(() => { if (!cancelled) setStyles([]); });
    return () => { cancelled = true; };
  }, []);

  const fail = (e: unknown) => {
    if (!(e instanceof ApiError)) { setError(errorText(e)); return; }
    setErrors(fieldErrorsText(e.fieldErrors));
    const toastError = (message: string) => setToast({ tone: 'error', message });
    switch (e.code) {
      // 404 USER_NOT_FOUND / 422 USER_NOT_ACTIVE: the customerEmail of POST /projects (or the lookup)
      case 'USER_NOT_FOUND': toastError(t('newProject.homeownerNotFound')); return;
      case 'DESIGN_STYLE_NOT_FOUND': toastError(t('newProject.styleNotFound')); return;
      case 'PROJECT_CODE_GENERATION_FAILED': toastError(t('newProject.codeFailed')); return;
      case 'USER_NOT_ACTIVE': toastError(t('newProject.homeownerInactive')); return;
      case 'APARTMENT_NOT_SURVEYED': toastError(t('errors.APARTMENT_NOT_SURVEYED')); return;
      case 'DESIGN_STYLE_INACTIVE': toastError(t('newProject.styleInactive')); return;
      case 'INVALID_BUDGET_RANGE':
        setErrors({ budgetMax: t('newProject.budgetOrderInline') });
        toastError(t('newProject.invalidBudgetRange'));
        return;
      default:
        if (e.status === 401 || e.status === 403) toastError(t('newProject.unauthorized'));
        else setError(errorText(e));
    }
  };
  const req = (v: string) => (v.trim() ? '' : t('common.required'));
  const emailError = (v: string) => req(v) || (/^[^s@]+@[^s@]+.[^s@]+$/.test(v.trim()) ? '' : t('newProject.emailInvalid'));
  const positive = (v: string) => (!v.trim() ? t('common.required') : Number(v) > 0 ? '' : t('common.positive'));
  const only = (e: Errors) => Object.fromEntries(Object.entries(e).filter(([, v]) => v));

  const findCustomer = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = only({ email: emailError(email) });
    setErrors(e); setError('');
    if (Object.keys(e).length) return;
    setBusy(true); setCustomer(null);
    try {
      setCustomer(await projectApi.findCustomer(email.trim()));
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const minNum = Number(project.budgetMin);
  const maxNum = Number(project.budgetMax);
  const budgetOrderError = project.budgetMin.trim() && project.budgetMax.trim() && minNum > maxNum ? t('newProject.budgetOrderInline') : '';
  const householdNum = Number(project.householdSize);
  const householdError = project.householdSize.trim() && (!Number.isInteger(householdNum) || householdNum < 1 || householdNum > 50) ? t('newProject.householdSizeHint') : '';
  const validateProject = () => only({
    title: req(project.title), budgetMin: positive(project.budgetMin),
    budgetMax: positive(project.budgetMax) || budgetOrderError,
    householdSize: householdError,
  });

  const create = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!customer) return;
    const e = validateProject();
    setErrors(e); setError(''); setToast(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const p = await projectApi.create({
        customerEmail: customer.email, title: project.title.trim(), budgetMin: project.budgetMin, budgetMax: project.budgetMax,
        ...(project.description.trim() ? { description: project.description.trim() } : {}),
        ...(project.householdSize.trim() ? { householdSize: householdNum } : {}),
        ...(project.preferredStyleId ? { preferredStyleId: project.preferredStyleId } : {}),
      });
      setToast({ tone: 'success', message: t('newProject.success') });
      // Brief pause so the confirmation is readable before the detail page opens.
      window.setTimeout(() => navigate(`/staff/projects/${p.id}`), 1000);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const setP = (k: keyof typeof blankProject) => (ev: { target: { value: string } }) => {
    setProject({ ...project, [k]: ev.target.value });
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };
  const steps = tList('newProject.steps');

  return (
    <AppShell>
      <PageHeader back={{ to: '/staff/projects', label: t('newProject.back') }} title={t('newProject.title')} description={t('newProject.description')} />
      <div className="mx-auto max-w-3xl space-y-5">
        <Card bodyClassName="px-4 py-4 sm:px-6"><Stepper steps={steps} current={step} /></Card>

        {step === 0 && (
          <Card title={steps[0]}>
            <form onSubmit={findCustomer} className="flex flex-wrap items-end gap-3" noValidate>
              <Field label={t('newProject.email')} hint={t('newProject.emailHint')} error={errors.email} className="min-w-0 flex-1 basis-64">
                {(f) => <Input {...f} type="email" autoComplete="off" value={email} invalid={!!errors.email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />}
              </Field>
              <Button type="submit" loading={busy} className="mb-[22px]">{t('newProject.find')}</Button>
            </form>
            {customer && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-[13px] text-emerald-700">{t('newProject.found')}</p>
                  <p className="font-semibold text-ink">{customer.fullName}</p>
                  <p className="text-xs text-slate-600">{customer.email}{customer.phone ? `, ${customer.phone}` : ''}</p>
                </div>
                <Button variant="primary" onClick={() => { setErrors({}); setStep(1); }}>{t('common.continue')}</Button>
              </div>
            )}
          </Card>
        )}

        {step === 1 && customer && (
          <form onSubmit={create} noValidate className="space-y-5">
            <Card title={steps[2]}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('newProject.projectName')} error={errors.title} className="sm:col-span-2">
                  {(f) => <Input {...f} maxLength={255} value={project.title} invalid={!!errors.title} onChange={setP('title')} placeholder={t('newProject.projectNamePlaceholder')} />}
                </Field>
                <Field label={t('newProject.budgetMin')} error={errors.budgetMin || budgetOrderError}>{(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={project.budgetMin} invalid={!!(errors.budgetMin || budgetOrderError)} onChange={setP('budgetMin')} />}</Field>
                <Field label={t('newProject.budgetMax')} error={errors.budgetMax || budgetOrderError}>{(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={project.budgetMax} invalid={!!(errors.budgetMax || budgetOrderError)} onChange={setP('budgetMax')} />}</Field>
                <Field label={t('newProject.householdSize')} hint={t('newProject.householdSizeNote')} optional error={errors.householdSize || householdError}>
                  {(f) => <Input {...f} type="number" inputMode="numeric" min={1} max={50} value={project.householdSize} invalid={!!(errors.householdSize || householdError)} onChange={setP('householdSize')} />}
                </Field>
                <Field label={t('newProject.style')} optional error={errors.preferredStyleId}>
                  {(f) => (
                    <Select {...f} value={project.preferredStyleId} invalid={!!errors.preferredStyleId} onChange={setP('preferredStyleId')}>
                      <option value="">{t('newProject.noStyle')}</option>
                      {styles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label={t('newProject.description2')} optional error={errors.description} className="sm:col-span-2">
                  {(f) => <Textarea {...f} rows={3} maxLength={5000} value={project.description} onChange={setP('description')} />}
                </Field>
              </div>
            </Card>

            <Card title={t('newProject.summary')}>
              <DetailList items={[
                { label: steps[0], value: `${customer.fullName} (${customer.email})` },
                { label: t('projectDetail.home'), value: <PendingSurvey /> },
                ...(project.budgetMin && project.budgetMax ? [{ label: t('projectDetail.budget'), value: t('projectDetail.budgetValue', { min: formatMoney(project.budgetMin), max: formatMoney(project.budgetMax) }) }] : []),
              ]} />
            </Card>

            {error && <ErrorState message={error} />}
            <div className="flex justify-between gap-2">
              <Button onClick={() => { setErrors({}); setStep(0); }}>{t('common.back')}</Button>
              <Button type="submit" variant="primary" loading={busy} disabled={!!budgetOrderError || !!householdError}>{busy ? t('newProject.creating') : t('newProject.create')}</Button>
            </div>
          </form>
        )}
        {step < 1 && error && <ErrorState message={error} />}
      </div>
      {toast && (
        <div role={toast.tone === 'success' ? 'status' : 'alert'}
          className={`fixed right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.tone === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : toast.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-100 bg-red-50 text-red-700'}`}>
          {toast.message}
        </div>
      )}
    </AppShell>
  );
}
