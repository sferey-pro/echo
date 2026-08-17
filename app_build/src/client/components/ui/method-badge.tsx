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
      colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
      break;
    case 'POST':
      colorClass = 'bg-blue-100 text-blue-700 border-blue-200';
      break;
    case 'PUT':
      colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
      break;
    case 'PATCH':
      colorClass = 'bg-purple-100 text-purple-700 border-purple-200';
      break;
    case 'DELETE':
      colorClass = 'bg-rose-100 text-rose-700 border-rose-200';
      break;
  }

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border w-14 text-center shrink-0', colorClass, className)}>
      {normalizedMethod}
    </span>
  );
}
