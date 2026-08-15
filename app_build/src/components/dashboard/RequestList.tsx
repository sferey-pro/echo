import React, { useState, useMemo, useRef } from 'react';
import type { ApiRequest, BrunoFolder } from '../../lib/parser';
import { cn } from '@/lib/utils';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';

interface RequestListProps {
  folders: BrunoFolder[];
  requests: ApiRequest[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
  onOpenSettings: () => void;
}

const methodColors: Record<string, string> = {
  GET: 'text-blue-400',
  POST: 'text-green-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

type ListItem = 
  | { type: 'starred-header', isExpanded: boolean }
  | { type: 'starred-request', request: ApiRequest }
  | { type: 'folder', folder: BrunoFolder, depth: number, isExpanded: boolean }
  | { type: 'request', request: ApiRequest, depth: number };

export function RequestList({ folders, requests, selectedRequestId, onSelectRequest, onOpenSettings }: RequestListProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

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

  const flattenedItems = useMemo(() => {
    const items: ListItem[] = [];
    
    // 1. Favoris
    const starredRequests = requests.filter(r => r.isStarred);
    if (starredRequests.length > 0) {
      const isStarredExpanded = expandedFolders.has('__starred__');
      items.push({ type: 'starred-header', isExpanded: isStarredExpanded });
      if (isStarredExpanded) {
        for (const req of starredRequests) {
          items.push({ type: 'starred-request', request: req });
        }
      }
    }

    // 2. Dossiers récursifs
    const traverse = (folderList: BrunoFolder[], depth: number) => {
      for (const folder of folderList) {
        const isExpanded = expandedFolders.has(folder.id);
        items.push({ type: 'folder', folder, depth, isExpanded });
        if (isExpanded) {
          if (folder.children) {
            traverse(folder.children, depth + 1);
          }
          const folderReqs = requests.filter(r => r.folderId === folder.id);
          for (const req of folderReqs) {
            items.push({ type: 'request', request: req, depth: depth + 1 });
          }
        }
      }
    };
    traverse(folders, 0);

    // 3. Root requests
    const rootRequests = requests.filter(r => r.folderId === 'root');
    for (const req of rootRequests) {
      items.push({ type: 'request', request: req, depth: 0 });
    }

    return items;
  }, [folders, requests, expandedFolders]);

  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Hauteur moyenne d'une ligne (ex: py-1.5 = 28px + gap)
    overscan: 10,
  });

  const renderVirtualItem = (virtualItem: VirtualItem) => {
    const item = flattenedItems[virtualItem.index] as ListItem;
    const style: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: `${virtualItem.size - 4}px`, // subtract 4px to act as vertical spacing (gap equivalent)
      transform: `translateY(${virtualItem.start}px)`,
    };

    if (item.type === 'starred-header') {
      return (
        <div 
          key={virtualItem.key}
          style={style}
          onClick={(e) => toggleFolder('__starred__', e)}
          className="flex items-center py-1.5 pr-2 hover:bg-white/5 active:scale-[0.99] rounded-md cursor-pointer text-sm text-neutral-200 transition-all duration-200 font-medium select-none"
        >
          <div style={{ paddingLeft: `0.5rem` }} className="flex items-center w-full">
            <span className="mr-2 text-[10px] opacity-70 w-3 text-center transition-transform duration-200" style={{ transform: item.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            <span className="mr-2 opacity-100 text-yellow-400">⭐</span>
            <span className="truncate">Favoris</span>
          </div>
        </div>
      );
    }

    if (item.type === 'folder') {
      return (
        <div 
          key={virtualItem.key}
          style={style}
          onClick={(e) => toggleFolder(item.folder.id, e)}
          className="flex items-center py-1.5 pr-2 hover:bg-white/5 active:scale-[0.99] rounded-md cursor-pointer text-sm text-neutral-200 transition-all duration-200 font-medium select-none"
        >
          <div style={{ paddingLeft: `${item.depth * 1 + 0.5}rem` }} className="flex items-center w-full">
            <span className="mr-2 text-[10px] opacity-70 w-3 text-center transition-transform duration-200" style={{ transform: item.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            <span className="mr-2 opacity-80 text-yellow-500/80">📁</span>
            <span className="truncate">{item.folder.name}</span>
          </div>
        </div>
      );
    }

    if (item.type === 'request' || item.type === 'starred-request') {
      const req = item.request;
      const depth = item.type === 'starred-request' ? 1 : (item as Extract<ListItem, { depth: number }>).depth;
      
      return (
        <div
          key={virtualItem.key}
          style={style}
          onClick={() => onSelectRequest(req.id)}
          className={cn(
            "flex items-center py-1.5 pr-2 rounded-md cursor-pointer text-sm transition-all duration-200 border-l-2 active:scale-[0.98]",
            selectedRequestId === req.id 
              ? "bg-gradient-to-r from-purple-500/20 to-transparent border-purple-500 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
              : "hover:bg-white/5 text-neutral-300 border-transparent"
          )}
        >
          <div style={{ paddingLeft: `${depth * 1 + 0.75}rem` }} className="flex items-center w-full">
            <span className={cn("font-mono text-[10px] font-bold w-12 tracking-wider shrink-0", methodColors[req.method] || 'text-neutral-400')}>
              {req.method}
            </span>
            <span className="truncate flex-1 font-medium">
              {req.isStarred && <span className="mr-1.5 text-yellow-500" title="Favori">⭐</span>}
              {req.name}
            </span>
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
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="h-full bg-neutral-950/40 backdrop-blur-3xl border-r border-white/5 flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-transparent">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-[10px] shadow-lg shadow-purple-500/20">
          E
        </div>
        <h2 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400 tracking-tight">Echo Explorer</h2>
        <div className="flex-1"></div>
        <span className="text-xs font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
          {requests.length} req
        </span>
        <button 
          onClick={onOpenSettings}
          className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all ml-1"
          title="Paramètres"
        >
          ⚙️
        </button>
      </div>
      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto p-2"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => renderVirtualItem(virtualItem))}
        </div>
      </div>
    </div>
  );
}
