import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, FolderPlus, Lightbulb, Mail, Search, UserSearch } from 'lucide-react';
import { AppShell, Button, Card, ErrorState, Field, Input, PageHeader, Select, Textarea, initials, toast } from '@/components/ui';
import { errorText, fieldErrorsText, formatMoney, t, tList } from '@/i18n';
import { ApiError } from '@/services/authService';
import { designStyleService } from '@/services/designStyleService';
import type { DesignStyle } from '@/services/designStyleService';
import { projectApi } from './projectApi';
import { PendingSurvey } from './ProjectInfoSections';
import { StepTrack } from './ProjectStepper';

type Customer = { id: string; email: string; fullName: string; phone: string };
type Errors = Record<string, string>;
const blankProject = { title: '', budgetMin: '', budgetMax: '', description: '', householdSize: '', preferredStyleId: '' };
const STEP_ICONS = [UserSearch, FolderPlus];

/** The homeowner as a small identity row: initials disc, name, email and phone. */
function CustomerIdentity({ customer, trailing }: { customer: Customer; trailing?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
        {initials(customer.fullName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{customer.fullName}</p>
        <p className="truncate text-xs text-slate-600">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</p>
      </div>
      {trailing}
    </div>
  );
}

/**
 * Staff: create a project in two steps, customer (by email) then project details. POST /projects takes the
 * customerEmail; the home is attached later, once the site survey is confirmed.
 * Layout: the same icon step track as the project pages; step 2 puts the form beside a sticky summary that holds the
 * submit button. Each step fades in (step-in, globals.css).
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
    const toastError = (message: string) => toast.error(message);
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
  const emailError = (v: string) => req(v) || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : t('newProject.emailInvalid'));
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
    setErrors(e); setError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const p = await projectApi.create({
        customerEmail: customer.email, title: project.title.trim(), budgetMin: project.budgetMin, budgetMax: project.budgetMax,
        ...(project.description.trim() ? { description: project.description.trim() } : {}),
        ...(project.householdSize.trim() ? { householdSize: householdNum } : {}),
        ...(project.preferredStyleId ? { preferredStyleId: project.preferredStyleId } : {}),
      });
      // The toast lives at the app root, so it stays readable on the project page.
      toast.success(t('newProject.success'));
      navigate(`/staff/projects/${p.id}`);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const setP = (k: keyof typeof blankProject) => (ev: { target: { value: string } }) => {
    setProject({ ...project, [k]: ev.target.value });
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };
  const goTo = (next: number) => { setErrors({}); setError(''); setStep(next); };

  const labels = tList('newProject.steps');
  const hints = tList('newProject.stepHints');
  const track = labels.map((label, i) => ({
    key: label, label, hint: hints[i], icon: STEP_ICONS[i],
    state: i < step ? 'done' as const : i === step ? 'active' as const : 'upcoming' as const,
  }));
  /** Typed amount, formatted under the budget fields so long numbers are easy to check. */
  const moneyHint = (v: string) => (Number(v) > 0 ? formatMoney(v) : undefined);
  const styleName = styles.find((x) => x.id === project.preferredStyleId)?.name ?? t('newProject.noStyle');

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader back={{ to: '/staff/projects', label: t('newProject.back') }} title={t('newProject.title')} description={t('newProject.description')} />

        <Card className="mb-5" bodyClassName="px-4 py-5 sm:px-6">
          <StepTrack label={t('newProject.stepsLabel')} steps={track} className="mx-auto max-w-xl" />
        </Card>

        {step === 0 && (
          <div key="customer" className="step-in grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card title={t('newProject.findTitle')} description={t('newProject.findDescription')} bodyClassName="p-5 sm:p-6">
              <form onSubmit={findCustomer} noValidate>
                <Field label={t('newProject.email')} hint={t('newProject.emailHint')} error={errors.email}>
                  {(f) => (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative min-w-0 flex-1">
                        <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          {...f}
                          type="email"
                          autoComplete="off"
                          value={email}
                          invalid={!!errors.email}
                          // a different email means a different homeowner: drop the one found before
                          onChange={(e) => { setEmail(e.target.value); setCustomer(null); }}
                          placeholder="name@example.com"
                          className="pl-9"
                        />
                      </div>
                      <Button type="submit" loading={busy}>
                        {!busy && <Search aria-hidden className="h-4 w-4" />}
                        {t('newProject.find')}
                      </Button>
                    </div>
                  )}
                </Field>
              </form>

              {customer && (
                <div className="step-in mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                    {t('newProject.found')}
                  </p>
                  <CustomerIdentity
                    customer={customer}
                    trailing={(
                      <Button variant="primary" onClick={() => goTo(1)} className="hidden sm:inline-flex">
                        {t('common.continue')}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      </Button>
                    )}
                  />
                  <Button variant="primary" block onClick={() => goTo(1)} className="mt-4 sm:hidden">
                    {t('common.continue')}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {error && <div className="mt-4"><ErrorState message={error} /></div>}
            </Card>

            {/* Side panel in the same column as step 2's summary, so both steps line up */}
            <aside className="rounded-card border border-dashed border-line-strong bg-canvas/60 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Lightbulb aria-hidden className="h-4 w-4 text-amber-600" />
                {t('newProject.tipsTitle')}
              </p>
              <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-slate-600">
                {tList('newProject.tips').map((tip) => (
                  <li key={tip} className="flex gap-2.5">
                    <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
                    {tip}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}

        {step === 1 && customer && (
          <form key="project" onSubmit={create} noValidate className="step-in grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card title={t('newProject.detailsTitle')} description={t('newProject.detailsDescription')} bodyClassName="p-5 sm:p-6">
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field label={t('newProject.projectName')} error={errors.title} className="sm:col-span-2">
                  {(f) => <Input {...f} maxLength={255} value={project.title} invalid={!!errors.title} onChange={setP('title')} placeholder={t('newProject.projectNamePlaceholder')} autoFocus />}
                </Field>
                <Field label={t('newProject.budgetMin')} hint={moneyHint(project.budgetMin)} error={errors.budgetMin || budgetOrderError}>
                  {(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={project.budgetMin} invalid={!!(errors.budgetMin || budgetOrderError)} onChange={setP('budgetMin')} placeholder="0" />}
                </Field>
                <Field label={t('newProject.budgetMax')} hint={moneyHint(project.budgetMax)} error={errors.budgetMax || budgetOrderError}>
                  {(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={project.budgetMax} invalid={!!(errors.budgetMax || budgetOrderError)} onChange={setP('budgetMax')} placeholder="0" />}
                </Field>
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
                  {(f) => <Textarea {...f} rows={4} maxLength={5000} value={project.description} onChange={setP('description')} />}
                </Field>
              </div>
            </Card>

            {/* Summary + submit: beside the form on desktop (stays in view while scrolling), below it on phones */}
            <aside className="lg:sticky lg:top-24">
              <Card title={t('newProject.summary')} bodyClassName="p-5">
                <CustomerIdentity
                  customer={customer}
                  trailing={<Button size="sm" variant="ghost" onClick={() => goTo(0)}>{t('newProject.change')}</Button>}
                />
                <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t('projectDetail.budget')}</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {project.budgetMin && project.budgetMax
                        ? t('projectDetail.budgetValue', { min: formatMoney(project.budgetMin), max: formatMoney(project.budgetMax) })
                        : t('common.none')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t('newProject.style')}</dt>
                    <dd className="text-right font-medium text-slate-900">{styleName}</dd>
                  </div>
                  {project.householdSize.trim() && !householdError && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">{t('newProject.householdSize')}</dt>
                      <dd className="text-right font-medium text-slate-900">{project.householdSize}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="mb-1.5 text-slate-500">{t('projectDetail.home')}</dt>
                    <dd><PendingSurvey /></dd>
                  </div>
                </dl>

                {error && <div className="mt-4"><ErrorState message={error} /></div>}

                <div className="mt-5 space-y-2">
                  <Button type="submit" variant="primary" block loading={busy} disabled={!!budgetOrderError || !!householdError}>
                    {busy ? t('newProject.creating') : t('newProject.create')}
                  </Button>
                  <Button variant="ghost" block onClick={() => goTo(0)}>
                    <ArrowLeft aria-hidden className="h-4 w-4" />
                    {t('common.back')}
                  </Button>
                </div>
              </Card>
            </aside>
          </form>
        )}
      </div>
    </AppShell>
  );
}
