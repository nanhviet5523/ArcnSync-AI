import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
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
  const baseStyles = 'px-4 py-2 text-xs font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2';
  const variantStyles =
    variant === 'primary'
      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
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