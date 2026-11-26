import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'primary-on-dark' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover disabled:bg-brand',
  'primary-on-dark': 'bg-brand-on-dark text-ink hover:brightness-95 disabled:opacity-50',
  secondary: 'border border-control bg-surface text-ink hover:bg-sand-50',
  ghost: 'text-slate-700 hover:bg-sand-50',
  danger: 'bg-danger text-white hover:brightness-90',
};
const SIZE: Record<Size, string> = { sm: 'h-8 px-2.5 text-[13px]', md: 'h-9 px-3.5 text-sm' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', loading, block, className = '', disabled, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
}
