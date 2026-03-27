'use client';

import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export default function Switch({ checked, onChange, disabled = false, label, description }: SwitchProps) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div
        className={`
          w-11 h-6 rounded-full transition-all duration-200 ease-in-out
          peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2
          ${checked 
            ? 'bg-[var(--primary-color)] peer-checked:bg-[var(--primary-color)]' 
            : 'bg-gray-200 peer-focus:ring-gray-300'
          }
          peer-focus:ring-offset-white
        `}
        style={{
          backgroundColor: checked ? 'var(--color-primary)' : undefined,
        }}
      >
        <div
          className={`
            absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm
            transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </div>
      {(label || description) && (
        <div className="ml-3">
          {label && <span className="text-sm font-medium text-gray-900">{label}</span>}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      )}
    </label>
  );
}
