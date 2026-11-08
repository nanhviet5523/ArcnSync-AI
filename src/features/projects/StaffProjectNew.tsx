import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, Button, Card, DetailList, ErrorState, Field, Input, PageHeader, Select, Stepper, Textarea } from '@/components/ui';
import { errorText, fieldErrorsText, formatMoney, formatNumber, t, tList } from '@/i18n';
import { ApiError } from '@/services/authService';
import { projectApi } from './projectApi';
import type { Apartment } from './projectApi';

type Customer = { id: string; email: string; fullName: string; phone: string };
type Errors = Record<string, string>;
const blankHome = { propertyType: 'HOUSE' as 'HOUSE' | 'APARTMENT', buildingName: '', address: '', unitNo: '', tower: '', netArea: '', bedroomCount: '2', bathroomCount: '2' };
const blankProject = { title: '', budgetMin: '', budgetMax: '', description: '' };

/** Staff: create a project in three steps — homeowner, home and floors, project details. */
export function StaffProjectNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [homes, setHomes] = useState<Apartment[]>([]);
  const [homeId, setHomeId] = useState<string>('new');
  const [home, setHome] = useState(blankHome);
  const [project, setProject] = useState(blankProject);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    setError(errorText(e));
    if (e instanceof ApiError) setErrors(fieldErrorsText(e.fieldErrors));
  };
  const req = (v: string) => (v.trim() ? '' : t('common.required'));
  const positive = (v: string) => (!v.trim() ? t('common.required') : Number(v) > 0 ? '' : t('common.positive'));
  const only = (e: Errors) => Object.fromEntries(Object.entries(e).filter(([, v]) => v));

  const findCustomer = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = only({ email: req(email) });
    setErrors(e); setError('');
    if (Object.keys(e).length) return;
    setBusy(true); setCustomer(null);
    try {
      const c = await projectApi.findCustomer(email.trim());
      const list = (await projectApi.listApartments(c.id)).items;
      setCustomer(c); setHomes(list); setHomeId(list[0]?.id ?? 'new');
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const validateHome = () => (homeId !== 'new' ? {} : only({
    buildingName: req(home.buildingName), address: req(home.address), unitNo: req(home.unitNo), netArea: positive(home.netArea),
    bedroomCount: home.bedroomCount === '' ? t('common.required') : '', bathroomCount: home.bathroomCount === '' ? t('common.required') : '',
  }));
  const validateProject = () => only({
    title: req(project.title), budgetMin: positive(project.budgetMin),
    budgetMax: positive(project.budgetMax) || (Number(project.budgetMax) < Number(project.budgetMin) ? t('newProject.budgetOrder') : ''),
  });

  const next = () => {
    const e = step === 1 ? validateHome() : {};
    setErrors(e); setError('');
    if (!Object.keys(e).length) setStep(step + 1);
  };

  const create = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!customer) return;
    const e = validateProject();
    setErrors(e); setError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      let apartmentId = homeId;
      if (homeId === 'new') {
        const created = await projectApi.createApartment({
          ownerEmail: customer.email, propertyType: home.propertyType, buildingName: home.buildingName.trim(), address: home.address.trim(),
          unitNo: home.unitNo.trim(), netArea: Number(home.netArea), bedroomCount: Number(home.bedroomCount), bathroomCount: Number(home.bathroomCount),
          ...(home.tower.trim() ? { tower: home.tower.trim() } : {}),
        });
        apartmentId = created.id;
        setHomes((h) => [created, ...h]); setHomeId(created.id);
      }
      const p = await projectApi.create({
        apartmentId, title: project.title.trim(), budgetMin: project.budgetMin, budgetMax: project.budgetMax,
        ...(project.description.trim() ? { description: project.description.trim() } : {}),
      });
      navigate(`/staff/projects/${p.id}`);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const setH = (k: keyof typeof blankHome) => (ev: { target: { value: string } }) => setHome({ ...home, [k]: ev.target.value });
  const setP = (k: keyof typeof blankProject) => (ev: { target: { value: string } }) => setProject({ ...project, [k]: ev.target.value });
  const chosen = homes.find((h) => h.id === homeId);
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
                  <p className="font-semibold text-slate-900">{customer.fullName}</p>
                  <p className="text-xs text-slate-600">{customer.email}{customer.phone ? `, ${customer.phone}` : ''}</p>
                </div>
                <Button variant="primary" onClick={() => { setErrors({}); setStep(1); }}>{t('common.continue')}</Button>
              </div>
            )}
          </Card>
        )}

        {step === 1 && customer && (
          <Card title={steps[1]} description={customer.fullName}>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-[13px] font-medium text-slate-700">{t('newProject.existing')}</legend>
              {!homes.length && <p className="text-sm text-slate-500">{t('newProject.noHomes')}</p>}
              {homes.map((h) => (
                <label key={h.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${homeId === h.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="home" className="mt-1" checked={homeId === h.id} onChange={() => setHomeId(h.id)} />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900">{h.buildingName}, {h.unitNo}</span>
                    <span className="block text-xs text-slate-500">{t(`projectDetail.propertyType.${h.propertyType}`)}, {h.address}</span>
                    <span className="block text-xs text-slate-500">{t('newProject.floors')}: {h.floors.map((f) => f.name).join(', ') || t('common.none')}</span>
                  </span>
                </label>
              ))}
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${homeId === 'new' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="home" checked={homeId === 'new'} onChange={() => setHomeId('new')} />
                <span className="font-medium text-slate-900">{t('newProject.createNew')}</span>
              </label>
            </fieldset>

            {homeId === 'new' && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label={t('newProject.type')}>
                  {(f) => (
                    <Select {...f} value={home.propertyType} onChange={setH('propertyType')}>
                      <option value="HOUSE">{t('projectDetail.propertyType.HOUSE')}</option>
                      <option value="APARTMENT">{t('projectDetail.propertyType.APARTMENT')}</option>
                    </Select>
                  )}
                </Field>
                <Field label={t('newProject.buildingName')} error={errors.buildingName}>{(f) => <Input {...f} maxLength={200} value={home.buildingName} invalid={!!errors.buildingName} onChange={setH('buildingName')} />}</Field>
                <Field label={t('newProject.address')} error={errors.address} className="sm:col-span-2">{(f) => <Input {...f} maxLength={500} value={home.address} invalid={!!errors.address} onChange={setH('address')} />}</Field>
                <Field label={t('newProject.unitNo')} error={errors.unitNo}>{(f) => <Input {...f} maxLength={50} value={home.unitNo} invalid={!!errors.unitNo} onChange={setH('unitNo')} />}</Field>
                <Field label={t('newProject.tower')} optional error={errors.tower}>{(f) => <Input {...f} maxLength={50} value={home.tower} onChange={setH('tower')} />}</Field>
                <Field label={t('newProject.area')} error={errors.netArea}>{(f) => <Input {...f} type="number" inputMode="decimal" min={1} step={0.01} value={home.netArea} invalid={!!errors.netArea} onChange={setH('netArea')} />}</Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('newProject.bedrooms')} error={errors.bedroomCount}>{(f) => <Input {...f} type="number" min={0} max={20} value={home.bedroomCount} invalid={!!errors.bedroomCount} onChange={setH('bedroomCount')} />}</Field>
                  <Field label={t('newProject.bathrooms')} error={errors.bathroomCount}>{(f) => <Input {...f} type="number" min={0} max={20} value={home.bathroomCount} invalid={!!errors.bathroomCount} onChange={setH('bathroomCount')} />}</Field>
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:col-span-2">{t('newProject.floorsAuto')}</p>
              </div>
            )}

            <div className="mt-6 flex justify-between gap-2">
              <Button onClick={() => { setErrors({}); setStep(0); }}>{t('common.back')}</Button>
              <Button variant="primary" onClick={next}>{t('common.continue')}</Button>
            </div>
          </Card>
        )}

        {step === 2 && customer && (
          <form onSubmit={create} noValidate className="space-y-5">
            <Card title={steps[2]}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('newProject.projectName')} error={errors.title} className="sm:col-span-2">
                  {(f) => <Input {...f} maxLength={255} value={project.title} invalid={!!errors.title} onChange={setP('title')} placeholder={t('newProject.projectNamePlaceholder')} />}
                </Field>
                <Field label={t('newProject.budgetMin')} error={errors.budgetMin}>{(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={project.budgetMin} invalid={!!errors.budgetMin} onChange={setP('budgetMin')} />}</Field>
                <Field label={t('newProject.budgetMax')} error={errors.budgetMax}>{(f) => <Input {...f} type="number" inputMode="numeric" min={1} value={project.budgetMax} invalid={!!errors.budgetMax} onChange={setP('budgetMax')} />}</Field>
                <Field label={t('newProject.description2')} optional error={errors.description} className="sm:col-span-2">
                  {(f) => <Textarea {...f} rows={3} maxLength={5000} value={project.description} onChange={setP('description')} />}
                </Field>
              </div>
            </Card>

            <Card title={t('newProject.summary')}>
              <DetailList items={[
                { label: steps[0], value: `${customer.fullName} (${customer.email})` },
                { label: t('projectDetail.home'), value: chosen ? `${chosen.buildingName}, ${chosen.unitNo}` : `${t('newProject.newHome')}: ${[home.buildingName, home.unitNo].filter(Boolean).join(', ')}` },
                ...(homeId === 'new' && home.netArea ? [{ label: t('projectDetail.area'), value: t('projectDetail.areaValue', { area: formatNumber(home.netArea) }) }] : []),
                ...(project.budgetMin && project.budgetMax ? [{ label: t('projectDetail.budget'), value: t('projectDetail.budgetValue', { min: formatMoney(project.budgetMin), max: formatMoney(project.budgetMax) }) }] : []),
              ]} />
            </Card>

            {error && <ErrorState message={error} />}
            <div className="flex justify-between gap-2">
              <Button onClick={() => { setErrors({}); setStep(1); }}>{t('common.back')}</Button>
              <Button type="submit" variant="primary" loading={busy}>{busy ? t('newProject.creating') : t('newProject.create')}</Button>
            </div>
          </form>
        )}
        {step < 2 && error && <ErrorState message={error} />}
      </div>
    </AppShell>
  );
}
