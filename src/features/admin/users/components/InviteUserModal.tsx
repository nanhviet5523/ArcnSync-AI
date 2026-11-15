import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { ApiError } from '@/services/authService';
import { createAdminUser } from '../usersApi';
import { EMAIL_REGEX, LANDLINE_REGEX, PHONE_REGEX, URL_REGEX } from '../validators';
import type { CreatableRole, CreateUserPayload, CreateUserResponse } from '../types';


const ROLE_OPTIONS: { value: CreatableRole; label: string }[] = [
  { value: 'STAFF', label: 'Staff' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'SUPPLIER', label: 'Supplier' },
];

interface FormValues {
  email: string;
  fullName: string;
  phone: string;
  role: CreatableRole;
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

const EMPTY: FormValues = {
  email: '',
  fullName: '',
  phone: '',
  role: 'DESIGNER',
  employeeCode: '',
  title: '',
  specialization: '',
  yearsOfExperience: '',
  bio: '',
  companyName: '',
  taxCode: '',
  businessAddress: '',
  contactName: '',
  contactPhone: '',
  website: '',
  partnerSince: '',
};

const DESIGNER_REQUIRED: [FieldKey, string][] = [
  ['employeeCode', 'Employee code is required'],
  ['title', 'Title is required'],
  ['specialization', 'Specialization is required'],
];

const SUPPLIER_REQUIRED: [FieldKey, string][] = [
  ['companyName', 'Company name is required'],
  ['taxCode', 'Tax code is required'],
  ['businessAddress', 'Business address is required'],
  ['contactName', 'Contact name is required'],
];

function validate(v: FormValues): FieldErrors {
  const e: FieldErrors = {};
  if (!v.fullName.trim()) e.fullName = 'Full name is required';
  if (!v.email.trim()) e.email = 'Email is required';
  else if (!EMAIL_REGEX.test(v.email.trim())) e.email = 'Enter a valid email address (e.g. name@example.com)';
  if (!v.phone.trim()) e.phone = 'Phone number is required';
  else if (!PHONE_REGEX.test(v.phone.trim())) e.phone = 'Phone must start with 0 and have exactly 10 digits';

  if (v.role === 'DESIGNER') {
    for (const [key, msg] of DESIGNER_REQUIRED) if (!v[key].trim()) e[key] = msg;
    const years = v.yearsOfExperience.trim();
    if (!years) e.yearsOfExperience = 'Years of experience is required';
    else if (!/^\d+$/.test(years) || Number(years) > 60) e.yearsOfExperience = 'Enter a whole number between 0 and 60';
  }

  if (v.role === 'SUPPLIER') {
    for (const [key, msg] of SUPPLIER_REQUIRED) if (!v[key].trim()) e[key] = msg;
    if (!v.contactPhone.trim()) e.contactPhone = 'Contact phone is required';
    else if (!LANDLINE_REGEX.test(v.contactPhone.trim())) e.contactPhone = 'Contact phone must start with 0 and have 10-11 digits';
    if (v.website.trim() && !URL_REGEX.test(v.website.trim())) e.website = 'Enter a valid URL starting with http:// or https://';
  }
  return e;
}

function buildPayload(v: FormValues): CreateUserPayload {
  const payload: CreateUserPayload = {
    email: v.email.trim(),
    fullName: v.fullName.trim(),
    phone: v.phone.trim(),
    role: v.role,
  };
  if (v.role === 'DESIGNER') {
    payload.designerProfile = {
      employeeCode: v.employeeCode.trim(),
      title: v.title.trim(),
      specialization: v.specialization.trim(),
      yearsOfExperience: Number(v.yearsOfExperience),
      ...(v.bio.trim() && { bio: v.bio.trim() }),
    };
  }
  if (v.role === 'SUPPLIER') {
    payload.supplierProfile = {
      companyName: v.companyName.trim(),
      taxCode: v.taxCode.trim(),
      businessAddress: v.businessAddress.trim(),
      contactName: v.contactName.trim(),
      contactPhone: v.contactPhone.trim(),
      ...(v.website.trim() && { website: v.website.trim() }),
      ...(v.partnerSince && { partnerSince: v.partnerSince }),
    };
  }
  return payload;
}

// Maps BE field errors (keys like "designerProfile.taxCode" or "email") onto form fields.
function mapServerFieldErrors(err: ApiError): FieldErrors {
  const out: FieldErrors = {};
  for (const [key, msg] of Object.entries(err.fieldErrors)) {
    const name = key.split('.').pop() as FieldKey;
    if (name in EMPTY) out[name] = msg;
  }
  return out;
}

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (res: CreateUserResponse) => void;
}

const inputBase =
  'w-full rounded-xl border px-3 py-2.5 text-sm font-normal outline-none transition focus:ring-2 focus:border-transparent';

export const InviteUserModal: React.FC<InviteUserModalProps> = ({ open, onClose, onCreated }) => {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fresh form every time the modal opens.
  useEffect(() => {
    if (open) {
      setValues(EMPTY);
      setFieldErrors({});
      setError('');
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const set = (key: FieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await createAdminUser(buildPayload(values));
      onCreated(res);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = mapServerFieldErrors(err);
        setFieldErrors(fields);
        // Show the BE message(s) unless every one of them is already pinned to a field.
        setError(Object.keys(fields).length > 0 && err.messages.length <= Object.keys(fields).length
          ? ''
          : err.messages.join(' ') || err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  const field = (
    key: FieldKey,
    label: string,
    opts: { type?: string; placeholder?: string; required?: boolean; inputMode?: 'numeric' | 'tel' } = {},
  ) => (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {opts.required !== false && <span className="text-red-500"> *</span>}
      <input
        type={opts.type ?? 'text'}
        inputMode={opts.inputMode}
        value={values[key]}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value)}
        className={`mt-1.5 ${inputBase} ${
          fieldErrors[key] ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-600'
        }`}
      />
      {fieldErrors[key] && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{fieldErrors[key]}</p>}
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="invite-user-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 id="invite-user-title" className="text-xl font-bold text-slate-900">Invite user</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          Create a staff, designer or supplier account. An activation email is sent to the user.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Role <span className="text-red-500">*</span>
            <select
              value={values.role}
              onChange={(e) => set('role', e.target.value)}
              className={`mt-1.5 bg-white ${inputBase} border-slate-200 focus:ring-blue-600`}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {field('fullName', 'Full name', { placeholder: 'e.g. Le Trang' })}
            {field('email', 'Work email', { type: 'email', placeholder: 'name@archsync.vn' })}
            {field('phone', 'Phone number', { type: 'tel', inputMode: 'tel', placeholder: '0901234567' })}
          </div>

          {values.role === 'DESIGNER' && (
            <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Designer profile</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('employeeCode', 'Employee code', { placeholder: 'NV001' })}
                {field('title', 'Title', { placeholder: 'Architect' })}
                {field('specialization', 'Specialization', { placeholder: 'Japandi, Scandinavian' })}
                {field('yearsOfExperience', 'Years of experience', { inputMode: 'numeric', placeholder: '5' })}
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

          {values.role === 'SUPPLIER' && (
            <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Supplier profile</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('companyName', 'Company name')}
                {field('taxCode', 'Tax code', { placeholder: '0312345678' })}
                {field('contactName', 'Contact name')}
                {field('contactPhone', 'Contact phone', { type: 'tel', inputMode: 'tel', placeholder: '0281234567' })}
                {field('website', 'Website', { required: false, placeholder: 'https://example.vn' })}
                {field('partnerSince', 'Partner since', { type: 'date', required: false })}
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
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {loading ? 'Sending...' : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;
