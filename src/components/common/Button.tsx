import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'primary-on-dark' | 'secondary' | 'ghost' | 'danger' | 'outline';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  children,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-4 py-2 text-xs font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50';
  const variantStyles = variant === 'primary' || variant === 'primary-on-dark'
    ? variant === 'primary-on-dark'
      ? 'bg-brand-on-dark text-ink hover:brightness-95'
      : 'bg-brand text-white hover:bg-brand-hover active:bg-brand-hover'
    : variant === 'danger'
      ? 'bg-danger hover:brightness-90 text-white'
      : variant === 'ghost'
        ? 'text-slate-700 hover:bg-sand-50'
        : 'border border-control bg-surface hover:bg-sand-50 active:bg-sand-100 text-ink';
  const widthStyles = fullWidth ? 'w-full' : 'w-auto';

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${widthStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
