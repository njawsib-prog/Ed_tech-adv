'use client';

import { useToast } from '@/context/ToastContext';

export default function Toast() {
  const { toasts, removeToast } = useToast();

  const getTypeStyles = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#10B981', color: 'white' };
      case 'error':
        return { backgroundColor: '#EF4444', color: 'white' };
      case 'info':
        return { backgroundColor: 'var(--color-primary)', color: 'white' };
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center justify-between px-4 py-3 rounded-base shadow-lg min-w-[300px] animate-slide-in"
          style={getTypeStyles(toast.type)}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-white hover:opacity-75"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}