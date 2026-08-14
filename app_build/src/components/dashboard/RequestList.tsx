import React from 'react';
import type { ApiRequest } from '../../lib/parser';
import { cn } from '@/lib/utils';

interface RequestListProps {
  requests: ApiRequest[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
}

const methodColors: Record<string, string> = {
  GET: 'text-blue-400',
  POST: 'text-green-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

export function RequestList({ requests, selectedRequestId, onSelectRequest }: RequestListProps) {
  return (
    <div className="h-full bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
        <h2 className="text-sm font-semibold text-neutral-200">Requêtes</h2>
        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
          {requests.length} requêtes
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {requests.map(req => (
          <div
            key={req.id}
            onClick={() => onSelectRequest(req.id)}
            className={cn(
              "flex items-center p-2 rounded-md cursor-pointer text-sm transition-all border-l-2 pl-3",
              selectedRequestId === req.id 
                ? "bg-purple-900/20 border-purple-500 text-white" 
                : "hover:bg-neutral-900 text-neutral-300 border-transparent"
            )}
          >
            <span className={cn("font-mono text-[10px] font-bold w-12 tracking-wider", methodColors[req.method] || 'text-neutral-400')}>
              {req.method}
            </span>
            <span className="truncate flex-1 font-medium">{req.name}</span>
            <span className="ml-2 flex items-center">
              {req.examples?.length > 0 && (
                <span 
                  className="w-2 h-2 rounded-full shadow-sm bg-purple-500 shadow-purple-500/50"
                  title={`${req.examples.length} exemple(s)`}
                />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
