/**
 * Button Component - Professional SaaS Design
 * Based on Cerebral, Notion, Claude.ai patterns
 */

import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
  href?: string;
}

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className'>;

export default function Button({
  variant = 'primary',
  size = 'medium',
  children,
  className = '',
  href,
  ...props
}: ButtonProps) {
  // Base styles
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-150 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `.replace(/\s+/g, ' ').trim();

  // Variant styles
  const variantStyles = {
    primary: `
      bg-accent-500 text-white
      hover:bg-accent-600 active:bg-accent-700
      focus:ring-accent-500
    `.replace(/\s+/g, ' ').trim(),

    secondary: `
      bg-white border-2 border-gray-300 text-gray-900
      hover:bg-gray-50 hover:border-gray-400
      active:bg-gray-100
      focus:ring-gray-400
    `.replace(/\s+/g, ' ').trim(),

    text: `
      bg-transparent text-accent-600
      hover:text-accent-700 hover:bg-accent-50
      active:bg-accent-100
      focus:ring-accent-500
    `.replace(/\s+/g, ' ').trim(),
  };

  // Size styles
  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm min-h-[36px]',
    medium: 'px-4 py-2.5 text-base min-h-[44px]',
    large: 'px-6 py-3 text-base min-h-[48px]',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

  // If href provided, render as link styled as button
  if (href) {
    return (
      <a
        href={href}
        className={combinedClassName}
        {...(props as AnchorProps)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={combinedClassName}
      {...props}
    >
      {children}
    </button>
  );
}
