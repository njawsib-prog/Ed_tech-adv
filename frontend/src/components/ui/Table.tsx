'use client';

import { ReactNode } from 'react';
import Spinner from './Spinner';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export default function Table<T extends { id?: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
}: TableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <div className="bg-white rounded-base shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b flex items-center px-4 space-x-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-base shadow overflow-hidden overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {safeData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            safeData.map((item, index) => (
              <tr
                key={(item as any).id || index}
                className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render
                      ? column.render(item)
                      : (item as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}