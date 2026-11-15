import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { ApiError } from '@/services/authService';
import { getAdminUserById, updateAdminUser } from '../usersApi';
import { isEmptyValue } from '../format';
import { LANDLINE_REGEX, PHONE_REGEX, URL_REGEX } from '../validators';
import type { AdminUserDetail, UpdateUserPayload } from '../types';

interface FormValues {
  fullName: string;
  phone: string;
  employeeCode: string;
  title: string;
  specialization: string;
  yearsOfExperience: string;
  bio: string;
  companyName: string;
  taxCode: string;
  businessAddress: string;
  contactName: string;
  contactPhone: string;
  website: string;
  partnerSince: string;
}

type FieldKey = keyof FormValues;
type FieldErrors = Partial<Record<FieldKey, string>>;

const DESIGNER_FIELDS: FieldKey[] = ['employeeCode', 'title', 'specialization', 'yearsOfExperience', 'bio'];
const SUPPLIER_FIELDS: FieldKey[] = [
  'companyName',
  'taxCode',
  'businessAddress',
  'contactName',
  'contactPhone',
  'website',
  'partnerSince',
];

// null / undefined / "" / the Swagger placeholder "string" all become an empty input.
const toInput = (value: string | number | null | undefined): string => (isEmptyValue(value) ? '' : String(value));

// The BE may return partnerSince as a full ISO timestamp; <input type="date"> needs YYYY-MM-DD.
const toDateInput = (value: string | null | undefined): string => (isEmptyValue(value) ? '' : String(value).slice(0, 10));

function toFormValues(user: AdminUserDetail): FormValues {
  const p = user.profile;
  const d = p?.type === 'DESIGNER' ? p : null;
  const s = p?.type === 'SUPPLIER' ? p : null;
  return {
    fullName: toInput(user.fullName),
    phone: toInput(user.phone),
    employeeCode: toInput(d?.employeeCode),
    title: toInput(d?.title),
    specialization: toInput(d?.specialization),
    yearsOfExperience: toInput(d?.yearsOfExperience),
    bio: toInput(d?.bio),
    companyName: toInput(s?.companyName),
    taxCode: toInput(s?.taxCode),
    businessAddress: toInput(s?.businessAddress),
    contactName: toInput(s?.contactName),
    contactPhone: toInput(s?.contactPhone),
    website: toInput(s?.website),
    partnerSince: toDateInput(s?.partnerSince),
  };
}

function validate(v: FormValues, role: string): FieldErrors {
  const e: FieldErrors = {};
  if (!v.fullName.trim()) e.fullName = 'Full name is required';
  if (!v.phone.trim()) e.phone = 'Phone number is required';
  else if (!PHONE_REGEX.test(v.phone.trim())) e.phone = 'Phone must start with 0 and have exactly 10 digits';

  if (role === 'DESIGNER') {
    const years = v.yearsOfExperience.trim();
    if (years && (!/^\d+$/.test(years) || Number(years) > 60)) e.yearsOfExperience = 'Enter a whole number between 0 and 60';
  }
  if (role === 'SUPPLIER') {
    if (v.contactPhone.trim() && !LANDLINE_REGEX.test(v.contactPhone.trim()))
      e.contactPhone = 'Contact phone must start with 0 and have 10-11 digits';
    if (v.website.trim() && !URL_REGEX.test(v.website.trim())) e.website = 'Enter a valid URL starting with http:// or https://';
  }
  return e;
}

// PATCH body with only the fields the admin actually changed. Cleared optional inputs are left out.
function buildPayload(initial: FormValues, current: FormValues, role: string): UpdateUserPayload {
  const changed = (key: FieldKey) => current[key].trim() !== initial[key].trim() && current[key].trim() !== '';
  const payload: UpdateUserPayload = {};
  if (changed('fullName')) payload.fullName = current.fullName.trim();
  if (changed('phone')) payload.phone = current.phone.trim();

  const pick = (keys: FieldKey[]) => {
    const out: Record<string, string | number> = {};
    for (const key of keys) {
      if (!changed(key)) continue;
      const value = current[key].trim();
      out[key] = key === 'yearsOfExperience' ? Number(value) : value;
    }
    return out;
  };

  if (role === 'DESIGNER') {
    const profile = pick(DESIGNER_FIELDS);
    if (Object.keys(profile).length > 0) payload.designerProfile = profile;
  }
  if (role === 'SUPPLIER') {
    const profile = pick(SUPPLIER_FIELDS);
    if (Object.keys(profile).length > 0) payload.supplierProfile = profile;
  }
  return payload;
}

function mapServerFieldErrors(err: ApiError): FieldErrors {
  const out: FieldErrors = {};
  for (const [key, msg] of Object.entries(err.fieldErrors)) {
    const name = key.split('.').pop() as FieldKey;
    if (DESIGNER_FIELDS.includes(name) || SUPPLIER_FIELDS.includes(name) || name === 'fullName' || name === 'phone') out[name] = msg;
  }
  return out;
}

const inputBase =
  'w-full rounded-xl border px-3 py-2.5 text-sm font-normal outline-none transition focus:ring-2 focus:border-transparent';

interface EditUserModalProps {
  userId: string | null; // null = closed
  onClose: () => void;
  onUpdated: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ userId, onClose, onUpdated }) => {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [initial, setInitial] = useState<FormValues | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the full record (the list rows have no profile) and pre-fill the form.
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    setUser(null);
    setInitial(null);
    setValues(null);
    setFieldErrors({});
    setError('');
    setLoadError('');
    setSaving(false);
    setLoading(true);
    getAdminUserById(userId)
      .then((res) => {
        if (ignore) return;
        const form = toFormValues(res);
        setUser(res);
        setInitial(form);
        setValues(form);
      })
      .catch((err) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : 'Failed to load user details.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [userId, reloadKey]);

  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId, saving, onClose]);

  if (!userId) return null;

  const set = (key: FieldKey, value: string) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !values || !initial) return;
    setError('');

    const errors = validate(values, user.role);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = buildPayload(initial, values, user.role);
    if (Object.keys(payload).length === 0) {
      setError('No changes to save.');
      return;
    }

    setSaving(true);
    try {
      await updateAdminUser(user.id, payload);
      onUpdated();
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = mapServerFieldErrors(err);
        setFieldErrors(fields);
        setError(
          Object.keys(fields).length > 0 && err.messages.length <= Object.keys(fields).length
            ? ''
            : err.messages.join(' ') || err.message,
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
      setSaving(false);
    }
  };

  const field = (key: FieldKey, label: string, opts: { type?: string; placeholder?: string; inputMode?: 'numeric' | 'tel' } = {}) =>
    values && (
      <label className="block text-sm font-medium text-slate-700">
        {label}
        <input
          type={opts.type ?? 'text'}
          inputMode={opts.inputMode}
          value={values[key]}
          placeholder={opts.placeholder}
          onChange={(e) => set(key, e.target.value)}
          className={`mt-1.5 ${inputBase} ${fieldErrors[key] ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-600'}`}
        />
        {fieldErrors[key] && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{fieldErrors[key]}</p>}
      </label>
    );

  const readOnlyField = (label: string, value: string) => (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        readOnly
        disabled
        className={`mt-1.5 ${inputBase} cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500`}
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="edit-user-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 id="edit-user-title" className="text-xl font-bold text-slate-900">Edit user</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-slate-500">Email and role cannot be changed.</p>

        {loading && (
          <div aria-busy="true" aria-label="Loading user" className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}

        {loadError && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{loadError}</p>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-2 font-semibold underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {user && values && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {readOnlyField('Email', user.email)}
              {readOnlyField('Role', user.role.charAt(0) + user.role.slice(1).toLowerCase())}
              {field('fullName', 'Full name')}
              {field('phone', 'Phone number', { type: 'tel', inputMode: 'tel', placeholder: '0901234567' })}
            </div>

            {user.role === 'DESIGNER' && (
              <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
                <legend className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Designer profile</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('employeeCode', 'Employee code', { placeholder: 'NV001' })}
                  {field('title', 'Title')}
                  {field('specialization', 'Specialization')}
                  {field('yearsOfExperience', 'Years of experience', { inputMode: 'numeric' })}
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Bio
                  <textarea
                    value={values.bio}
                    onChange={(e) => set('bio', e.target.value)}
                    rows={3}
                    className={`mt-1.5 ${inputBase} border-slate-200 focus:ring-blue-600`}
                  />
                </label>
              </fieldset>
            )}

            {user.role === 'SUPPLIER' && (
              <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
                <legend className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Supplier profile</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('companyName', 'Company name')}
                  {field('taxCode', 'Tax code')}
                  {field('contactName', 'Contact name')}
                  {field('contactPhone', 'Contact phone', { type: 'tel', inputMode: 'tel' })}
                  {field('website', 'Website', { placeholder: 'https://example.vn' })}
                  {field('partnerSince', 'Partner since', { type: 'date' })}
                </div>
                {field('businessAddress', 'Business address')}
              </fieldset>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditUserModal;
