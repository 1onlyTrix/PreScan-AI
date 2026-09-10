import React, { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export const Table: React.FC<HTMLAttributes<HTMLTableElement>> = ({ className, children, ...props }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 bg-white">
    <table className={cn('w-full text-left text-sm text-neutral-700', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({ className, children, ...props }) => (
  <thead className={cn('bg-neutral-50/80 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider', className)} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({ className, children, ...props }) => (
  <tbody className={cn('divide-y divide-neutral-100', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<HTMLAttributes<HTMLTableRowElement>> = ({ className, children, ...props }) => (
  <tr className={cn('hover:bg-neutral-50/60 transition-colors', className)} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<ThHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <th className={cn('px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider select-none', className)} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<TdHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <td className={cn('px-4 py-3.5 text-sm text-neutral-800 align-middle', className)} {...props}>
    {children}
  </td>
);
