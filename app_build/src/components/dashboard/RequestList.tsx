import React, { useState, useMemo, useRef } from 'react';
import type { ApiRequest, BrunoFolder } from '../../lib/parser';
import { cn } from '@/lib/utils';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { ChevronRight, Folder, FolderOpen, Star, RefreshCw, Library, Settings, Zap } from 'lucide-react';

interface RequestListProps {
  folders: BrunoFolder[];
  requests: ApiRequest[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
  onOpenSettings: () => void;
  onOpenCollections: () => void;
  onRefresh: () => void;
}

const methodColors: Record<string, string> = {
  GET: 'text-blue-400',
  POST: 'text-green-500',
  PUT: 'text-yellow-500',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-500',
};

type ListItem = 
  | { type: 'starred-header', isExpanded: boolean }
  | { type: 'starred-request', request: ApiRequest }
  | { type: 'folder', folder: BrunoFolder, depth: number, isExpanded: boolean }
  | { type: 'request', request: ApiRequest, depth: number };

export function RequestList({ folders, requests, selectedRequestId, onSelectRequest, onOpenSettings, onOpenCollections, onRefresh }: RequestListProps) {
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

    // 2. Traitement récursif pour folders et requêtes au même niveau
    const processLevel = (folderList: BrunoFolder[], reqList: ApiRequest[], depth: number) => {
      for (const folder of folderList) {
        const isExpanded = expandedFolders.has(folder.id);
        items.push({ type: 'folder', folder, depth, isExpanded });
        if (isExpanded) {
          const childFolders = folder.children || [];
          const childReqs = requests.filter(r => r.folderId === folder.id);
          processLevel(childFolders, childReqs, depth + 1);
        }
      }
      for (const req of reqList) {
        items.push({ type: 'request', request: req, depth });
      }
    };

    const rootRequests = requests.filter(r => r.folderId === 'root');
    processLevel(folders, rootRequests, 0);

    return items;
  }, [folders, requests, expandedFolders]);

  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // Plus compact comme Bruno
    overscan: 10,
  });

  const renderVirtualItem = (virtualItem: VirtualItem) => {
    const item = flattenedItems[virtualItem.index] as ListItem;
    const style: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: `${virtualItem.size}px`,
      transform: `translateY(${virtualItem.start}px)`,
    };

    if (item.type === 'starred-header') {
      return (
        <div 
          key={virtualItem.key}
          style={style}
          onClick={(e) => toggleFolder('__starred__', e)}
          className="flex items-center px-2 hover:bg-white/5 active:scale-[0.99] cursor-pointer text-xs text-neutral-200 transition-colors font-semibold select-none group"
        >
          <ChevronRight 
            className={cn("w-3.5 h-3.5 mr-1 text-neutral-500 transition-transform duration-200", item.isExpanded && "rotate-90")} 
          />
          <Star className="w-3.5 h-3.5 mr-1.5 text-yellow-500" fill="currentColor" />
          <span className="truncate">Favoris</span>
        </div>
      );
    }

    if (item.type === 'folder') {
      // Guide d'indentation visuelle
      const paddingLeft = `${item.depth * 1.1 + 0.5}rem`;
      
      return (
        <div 
          key={virtualItem.key}
          style={style}
          onClick={(e) => toggleFolder(item.folder.id, e)}
          className="flex items-center pr-2 hover:bg-white/5 active:scale-[0.99] cursor-pointer text-xs text-neutral-300 transition-colors font-medium select-none group relative"
        >
          <div style={{ paddingLeft }} className="flex items-center w-full h-full relative">
            {/* Indentation guide lines */}
            {Array.from({ length: item.depth }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5 group-hover:bg-white/10 transition-colors" style={{ left: `${(i + 1) * 1.1 - 0.15}rem` }} />
            ))}
            <ChevronRight 
              className={cn("w-3.5 h-3.5 mr-1 text-neutral-500 transition-transform duration-200 z-10", item.isExpanded && "rotate-90")} 
            />
            {item.isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-yellow-600/80 z-10" />
            ) : (
              <Folder className="w-3.5 h-3.5 mr-1.5 text-yellow-600/80 z-10" fill="currentColor" />
            )}
            <span className="truncate z-10">{item.folder.name}</span>
          </div>
        </div>
      );
    }

    if (item.type === 'request' || item.type === 'starred-request') {
      const req = item.request;
      const depth = item.type === 'starred-request' ? 1 : (item as Extract<ListItem, { depth: number }>).depth;
      const paddingLeft = `${depth * 1.1 + 1.25}rem`;
      
      return (
        <div
          key={virtualItem.key}
          style={style}
          onClick={() => onSelectRequest(req.id)}
          className={cn(
            "flex items-center pr-2 cursor-pointer text-xs transition-colors select-none group relative border-l-2",
            selectedRequestId === req.id 
              ? "bg-indigo-500/10 border-indigo-500 text-white" 
              : "hover:bg-white/5 text-neutral-400 border-transparent"
          )}
        >
          <div style={{ paddingLeft }} className="flex items-center w-full h-full relative">
             {/* Indentation guide lines */}
            {Array.from({ length: depth }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5 group-hover:bg-white/10 transition-colors" style={{ left: `${(i + 1) * 1.1 - 0.15}rem` }} />
            ))}
            
            <span className={cn("font-mono text-[9px] font-bold w-10 shrink-0 z-10", methodColors[req.method] || 'text-neutral-500')}>
              {req.method}
            </span>
            <span className="truncate flex-1 z-10 font-medium">
              {req.isStarred && <Star className="w-3 h-3 inline mr-1 text-yellow-500" fill="currentColor" />}
              {req.name}
            </span>
            <span className="ml-2 flex items-center shrink-0 z-10">
              {req.isMocked && <Zap className="w-3 h-3 text-green-400 mr-1" />}
            </span>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="h-full bg-neutral-900/50 flex flex-col font-sans">
      <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-transparent">
        <h2 className="text-xs font-semibold text-neutral-200 tracking-wide uppercase flex-1">Collection</h2>
        <span className="text-[10px] font-mono text-neutral-500 px-1.5 py-0.5 rounded bg-black/40 border border-white/5">
          {requests.length}
        </span>
        <div className="flex items-center gap-0.5 border-l border-white/10 pl-2 ml-1">
          <button 
            onClick={onRefresh}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Actualiser la collection"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onOpenCollections}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Gérer les Collections"
          >
            <Library className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Paramètres"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20"
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
