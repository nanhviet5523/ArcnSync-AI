import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({
  label,
  id,
  error,
  className = '',
  ...props
}: InputProps) => {
  return (
    <div className="mb-4 text-left w-full">
      {label && (
        <label
          htmlFor={id}
          className="block mb-1.5 text-sm font-semibold text-slate-900"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3.5 py-2.5 rounded-lg border border-control text-sm text-ink bg-sand-100 placeholder:text-subtext outline-none transition-all duration-200 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft disabled:bg-sand-100 disabled:text-slate-500 ${
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};
