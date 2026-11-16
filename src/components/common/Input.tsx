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
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};
