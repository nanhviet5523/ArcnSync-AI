import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell, Button, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { errorText, fieldErrorsText, t } from '@/i18n';
import { ApiError } from '@/services/authService';
import { catalogService } from '@/services/catalogService';
import type { CatalogCategory, CostCategory } from '@/services/catalogService';

const COST: CostCategory[] = ['FURNITURE', 'FINISHING', 'LIGHTING', 'DECOR', 'OTHER'];
type Form = { id: string | null; code: string; name: string; parentId: string; defaultModelUrl: string | null; hasDefaultModel: boolean; modelFile: File | null; costCategory: CostCategory | ''; isActive: boolean };
const blank: Form = { id: null, code: '', name: '', parentId: '', defaultModelUrl: null, hasDefaultModel: false, modelFile: null, costCategory: 'FURNITURE', isActive: true };

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
    setForm(c ? { id: c.id, code: c.code, name: c.name, parentId: c.parentId ?? '', defaultModelUrl: c.defaultModelUrl, hasDefaultModel: c.hasDefaultModel, modelFile: null, costCategory: c.costCategory ?? '', isActive: c.isActive } : { ...blank });
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
      let categoryId = form.id;
      if (form.id) {
        await catalogService.updateAdminCategory(form.id, {
          name: form.name.trim(), parentId: form.parentId || null, isActive: form.isActive,
          costCategory: form.costCategory || null,
        });
      } else {
        const created = await catalogService.createAdminCategory({
          code: form.code.trim().toUpperCase(), name: form.name.trim(), isActive: form.isActive,
          ...(form.parentId ? { parentId: form.parentId } : {}),
          ...(form.costCategory ? { costCategory: form.costCategory } : {}),
        });
        categoryId = created.id;
        // Keep the created ID in the form if the separate model upload fails, so retry won't create a duplicate category.
        if (form.modelFile) setForm((current) => current ? { ...current, id: created.id, defaultModelUrl: created.defaultModelUrl, hasDefaultModel: created.hasDefaultModel } : current);
      }
      if (form.modelFile && categoryId) await catalogService.uploadCategoryModel(categoryId, form.modelFile);
      setForm(null); await load();
    } catch (e) {
      setFormError(errorText(e));
      if (e instanceof ApiError) setFieldErrors(fieldErrorsText(e.fieldErrors));
    } finally { setBusy(false); }
  };

  const removeModel = async () => {
    if (!form?.id) return;
    setBusy(true); setFormError('');
    try {
      await catalogService.removeCategoryModel(form.id);
      setForm((current) => current ? { ...current, defaultModelUrl: null, hasDefaultModel: false, modelFile: null } : current);
      await load();
    } catch (e) { setFormError(errorText(e)); }
    finally { setBusy(false); }
  };

  const downloadModel = async () => {
    if (!form?.id) return;
    setBusy(true); setFormError('');
    try {
      const blob = await catalogService.downloadCategoryModel(form.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${form.code.toLowerCase()}-model-3d.glb`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setFormError(errorText(e)); }
    finally { setBusy(false); }
  };

  const parentName = (id: string | null) => items?.find((c) => c.id === id)?.name;
  const columns: Column<CatalogCategory>[] = [
    { key: 'code', header: t('categories.col.code'), sort: (c) => c.code, cell: (c) => <span className="font-mono text-[13px] text-ink">{c.code}</span> },
    { key: 'name', header: t('categories.col.name'), sort: (c) => c.name.toLowerCase(), cell: (c) => <span className="font-medium text-ink">{c.name}</span> },
    { key: 'parent', header: t('categories.col.parent'), cell: (c) => <span className="text-slate-600">{parentName(c.parentId) ?? t('common.none')}</span> },
    { key: 'cost', header: t('categories.col.cost'), sort: (c) => c.costCategory ?? '~', cell: (c) => <span className="text-slate-600">{c.costCategory ? t(`categories.costGroup.${c.costCategory}`) : t('common.none')}</span> },
    { key: 'model', header: t('categories.col.model'), hideOnMobile: true, cell: (c) => <span className="text-xs text-slate-500">{c.hasDefaultModel ? (c.defaultModelUrl ?? 'Model available') : t('common.none')}</span> },
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
            <Field label={t('categories.model')} hint="Upload a .glb file (maximum 50 MB). Model files are managed separately from category details.">
              {(f) => <div className="space-y-2"><Input {...f} type="file" accept=".glb,model/gltf-binary" onChange={(e) => set({ modelFile: e.target.files?.[0] ?? null })} />
                <p className="text-xs text-slate-500">{form.hasDefaultModel ? `A model is attached${form.defaultModelUrl ? `: ${form.defaultModelUrl}` : ''}.` : 'No model attached.'}</p>
                {form.id && form.hasDefaultModel && <div className="flex gap-2">{form.defaultModelUrl?.startsWith('/product-categories/') && <Button size="sm" disabled={busy} onClick={downloadModel}>Download model</Button>}<Button size="sm" disabled={busy} onClick={removeModel}>Remove model</Button></div>}
              </div>}
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
