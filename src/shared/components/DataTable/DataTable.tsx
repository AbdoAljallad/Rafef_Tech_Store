import { EmptyState } from '../EmptyState/EmptyState';
import type { ReactNode } from 'react';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({ columns, rows, getRowKey, isLoading, emptyText, onRowClick }: DataTableProps<T>) {
  if (isLoading) {
    return <div className="table-state">Загрузка...</div>;
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyText || 'Нет данных'} />;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={onRowClick ? 'clickable' : undefined}
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
