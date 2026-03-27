'use client';

import { ReactNode } from 'react';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function PageWrapper({ title, children, actions }: PageWrapperProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-heading text-gray-900 mb-2 sm:mb-0">{title}</h1>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}