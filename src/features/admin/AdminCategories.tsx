import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell, Button, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, fieldErrorsText, t } from '@/i18n';
import { ApiError } from '@/services/authService';
import { catalogService } from '@/services/catalogService';
import type { CatalogCategory, CostCategory } from '@/services/catalogService';

const COST: CostCategory[] = ['FURNITURE', 'FINISHING', 'LIGHTING', 'DECOR', 'OTHER'];
type Form = { id: string | null; code: string; name: string; parentId: string; defaultModelUrl: string; costCategory: CostCategory | ''; isActive: boolean };
const blank: Form = { id: null, code: '', name: '', parentId: '', defaultModelUrl: '', costCategory: 'FURNITURE', isActive: true };

/** Shared product categories: only the admin creates and edits them; suppliers pick one when adding a product. */
export function AdminCategories() {
  const [items, setItems] = useState<CatalogCategory[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try { setItems((await catalogService.listAdminCategories({ limit: 100 })).items); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const openForm = (c?: CatalogCategory) => {
    setFormError(''); setFieldErrors({});
    setForm(c ? { id: c.id, code: c.code, name: c.name, parentId: c.parentId ?? '', defaultModelUrl: c.defaultModelUrl ?? '', costCategory: c.costCategory ?? '', isActive: c.isActive } : blank);
  };
  const set = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));

  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    const local: Record<string, string> = {};
    if (!form.id && !/^[A-Z0-9_]+$/.test(form.code)) local.code = form.code ? t('categories.codeHint') : t('common.required');
    if (!form.name.trim()) local.name = t('common.required');
    setFieldErrors(local); setFormError('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      if (form.id) {
        await catalogService.updateAdminCategory(form.id, {
          name: form.name.trim(), parentId: form.parentId || null, isActive: form.isActive,
          defaultModelUrl: form.defaultModelUrl.trim() || null, costCategory: form.costCategory || null,
        });
      } else {
        await catalogService.createAdminCategory({
          code: form.code.trim().toUpperCase(), name: form.name.trim(), isActive: form.isActive,
          ...(form.parentId ? { parentId: form.parentId } : {}),
          ...(form.defaultModelUrl.trim() ? { defaultModelUrl: form.defaultModelUrl.trim() } : {}),
          ...(form.costCategory ? { costCategory: form.costCategory } : {}),
        });
      }
      setForm(null); await load();
    } catch (e) {
      setFormError(errorText(e));
      if (e instanceof ApiError) setFieldErrors(fieldErrorsText(e.fieldErrors));
    } finally { setBusy(false); }
  };

  const parentName = (id: string | null) => items?.find((c) => c.id === id)?.name;
  const columns: Column<CatalogCategory>[] = [
    { key: 'code', header: t('categories.col.code'), sort: (c) => c.code, cell: (c) => <span className="font-mono text-[13px] text-slate-800">{c.code}</span> },
    { key: 'name', header: t('categories.col.name'), sort: (c) => c.name.toLowerCase(), cell: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
    { key: 'parent', header: t('categories.col.parent'), cell: (c) => <span className="text-slate-600">{parentName(c.parentId) ?? t('common.none')}</span> },
    { key: 'cost', header: t('categories.col.cost'), sort: (c) => c.costCategory ?? '~', cell: (c) => <span className="text-slate-600">{c.costCategory ? t(`categories.costGroup.${c.costCategory}`) : t('common.none')}</span> },
    { key: 'model', header: t('categories.col.model'), hideOnMobile: true, className: 'max-w-56', cell: (c) => <span className="block truncate text-xs text-slate-500">{c.defaultModelUrl ?? t('common.none')}</span> },
    { key: 'status', header: t('categories.col.status'), sort: (c) => (c.isActive ? 0 : 1), cell: (c) => <StatusChip tone={c.isActive ? 'green' : 'gray'} label={t(c.isActive ? 'categories.active' : 'categories.hidden')} /> },
  ];

  return (
    <AppShell>
      <PageHeader title={t('categories.title')} description={t('categories.description')}
        primary={<Button variant="primary" onClick={() => openForm()}>{t('categories.new')}</Button>} />
      <DataTable columns={columns} rows={items} rowKey={(c) => c.id} error={error} onRetry={load} onRowClick={openForm} pageSize={15}
        initialSort={{ key: 'code', dir: 'asc' }}
        empty={<EmptyState title={t('categories.empty')} action={<Button variant="primary" size="sm" onClick={() => openForm()}>{t('categories.new')}</Button>} />} />

      {form && (
        <Modal title={form.id ? t('categories.editTitle', { code: form.code }) : t('categories.newTitle')} onClose={() => setForm(null)} footer={<>
          <Button onClick={() => setForm(null)}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="category-form" loading={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
        </>}>
          <form id="category-form" onSubmit={save} noValidate className="space-y-4">
            <Field label={t('categories.code')} hint={t('categories.codeHint')} error={fieldErrors.code}>
              {(f) => <Input {...f} autoFocus={!form.id} disabled={!!form.id} maxLength={44} value={form.code} invalid={!!fieldErrors.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className="font-mono" />}
            </Field>
            <Field label={t('categories.name')} error={fieldErrors.name}>
              {(f) => <Input {...f} autoFocus={!!form.id} maxLength={150} value={form.name} invalid={!!fieldErrors.name} onChange={(e) => set({ name: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('categories.parent')} error={fieldErrors.parentId}>
                {(f) => (
                  <Select {...f} value={form.parentId} onChange={(e) => set({ parentId: e.target.value })}>
                    <option value="">{t('categories.noParent')}</option>
                    {items?.filter((c) => c.id !== form.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={t('categories.cost')} error={fieldErrors.costCategory}>
                {(f) => (
                  <Select {...f} value={form.costCategory} onChange={(e) => set({ costCategory: e.target.value as CostCategory | '' })}>
                    <option value="">{t('categories.noCost')}</option>
                    {COST.map((c) => <option key={c} value={c}>{t(`categories.costGroup.${c}`)}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            <Field label={t('categories.model')} hint={t('categories.modelHint')} error={fieldErrors.defaultModelUrl}>
              {(f) => <Input {...f} maxLength={500} value={form.defaultModelUrl} onChange={(e) => set({ defaultModelUrl: e.target.value })} placeholder="/models/placeholders/ph-sofa.glb" />}
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
              {t('categories.isActive')}
            </label>
            {formError && <ErrorState message={formError} />}
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
