import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { t } from '@/i18n';

/** width defaults to full; pass a width class (e.g. w-48) through className to override */
const control = (invalid?: boolean, className = '') =>
  `block ${/(^|\s)(sm:|md:)?w-/.test(className) ? '' : 'w-full'} rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-500 ${invalid ? 'border-rose-400' : 'border-slate-300'}`;

/** Label + control + hint/error. The child receives id and aria-describedby. */
export function Field({ label, hint, error, optional, children, className = '' }: {
  label: string; hint?: string; error?: string; optional?: boolean; className?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-slate-700">
        {label}{optional && <span className="font-normal text-slate-400">({t('newProject.optional')})</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-rose-600">{error}</p>
        : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Input({ invalid, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`h-9 ${control(invalid, className)} ${className}`} {...rest} />;
}
export function Select({ invalid, className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select className={`h-9 pr-8 ${control(invalid, className)} ${className}`} {...rest}>{children}</select>;
}
export function Textarea({ invalid, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={`py-2 ${control(invalid, className)} ${className}`} {...rest} />;
}

/** Search box + filters on one row; wraps on small screens. */
export function FilterBar({ search, onSearch, placeholder, children }: { search: string; onSearch: (v: string) => void; placeholder: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-64">
        <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><path fill="currentColor" d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65-1.06 1.06-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /></svg>
        <Input type="search" aria-label={placeholder} placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} className="pl-9" />
      </div>
      {children}
    </div>
  );
}
