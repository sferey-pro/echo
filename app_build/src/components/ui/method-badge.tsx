import React from 'react';
import { cn } from '../../lib/utils';

interface MethodBadgeProps {
  method: string;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  const normalizedMethod = method?.toUpperCase() || 'GET';
  
  let colorClass = 'bg-slate-100 text-slate-800 border-slate-200';
  
  switch (normalizedMethod) {
    case 'GET':
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'POST':
      colorClass = 'bg-green-50 text-green-700 border-green-200';
      break;
    case 'PUT':
    case 'PATCH':
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'DELETE':
      colorClass = 'bg-red-50 text-red-700 border-red-200';
      break;
  }

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border w-14 text-center shrink-0', colorClass, className)}>
      {normalizedMethod}
    </span>
  );
}
