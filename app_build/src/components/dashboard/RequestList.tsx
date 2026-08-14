import React, { useState } from 'react';
import type { ApiRequest, BrunoFolder } from '../../lib/parser';
import { cn } from '@/lib/utils';

interface RequestListProps {
  folders: BrunoFolder[];
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

export function RequestList({ folders, requests, selectedRequestId, onSelectRequest }: RequestListProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderRequest = (req: ApiRequest, depth: number) => {
    return (
      <div
        key={req.id}
        onClick={() => onSelectRequest(req.id)}
        className={cn(
          "flex items-center py-1.5 pr-2 rounded-md cursor-pointer text-sm transition-all border-l-2",
          selectedRequestId === req.id 
            ? "bg-purple-900/20 border-purple-500 text-white" 
            : "hover:bg-neutral-900 text-neutral-300 border-transparent"
        )}
        style={{ paddingLeft: `${depth * 1 + 0.75}rem` }}
      >
        <span className={cn("font-mono text-[10px] font-bold w-12 tracking-wider shrink-0", methodColors[req.method] || 'text-neutral-400')}>
          {req.method}
        </span>
        <span className="truncate flex-1 font-medium">{req.name}</span>
        <span className="ml-2 flex items-center shrink-0">
          <span 
            className={cn(
              "w-2 h-2 rounded-full shadow-sm",
              req.isMocked ? "bg-green-500 shadow-green-500/50" : (req.examples?.length > 0 ? "bg-purple-500 shadow-purple-500/50" : "bg-transparent")
            )}
            title={req.isMocked ? 'Mock Actif' : (req.examples?.length > 0 ? `${req.examples.length} exemple(s)` : '')}
          />
        </span>
      </div>
    );
  };

  const renderFolder = (folder: BrunoFolder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderRequests = requests.filter(r => r.folderId === folder.id);
    
    return (
      <div key={folder.id} className="flex flex-col">
        <div 
          onClick={(e) => toggleFolder(folder.id, e)}
          className="flex items-center py-1.5 pr-2 hover:bg-neutral-800 rounded-md cursor-pointer text-sm text-neutral-200 transition-colors font-medium select-none"
          style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
        >
          <span className="mr-2 text-[10px] opacity-70 w-3 text-center transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
          <span className="mr-2 opacity-80 text-yellow-500/80">📁</span>
          <span className="truncate">{folder.name}</span>
        </div>
        
        {isExpanded && (
          <div className="flex flex-col">
            {folder.children && folder.children.map(child => renderFolder(child, depth + 1))}
            {folderRequests.map(req => renderRequest(req, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootRequests = requests.filter(r => r.folderId === 'root');

  return (
    <div className="h-full bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="p-4 border-b border-neutral-800 flex items-center gap-2 bg-neutral-900/50">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-[10px]">
          E
        </div>
        <h2 className="text-sm font-bold text-white tracking-tight">Echo Explorer</h2>
        <div className="flex-1"></div>
        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">
          {requests.length} requêtes
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {folders.map(f => renderFolder(f))}
        {rootRequests.map(req => renderRequest(req, 0))}
      </div>
    </div>
  );
}
