'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  className?: string;
}

export default function Badge({ variant = 'primary', children, className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--color-primary-light)',
      color: 'var(--color-primary)',
    },
    success: {
      backgroundColor: '#D1FAE5',
      color: '#065F46',
    },
    warning: {
      backgroundColor: '#FEF3C7',
      color: '#92400E',
    },
    danger: {
      backgroundColor: '#FEE2E2',
      color: '#991B1B',
    },
    info: {
      backgroundColor: '#DBEAFE',
      color: '#1E40AF',
    },
  };

  return (
    <span className={`${baseStyles} ${className}`} style={variantStyles[variant]}>
      {children}
    </span>
  );
}