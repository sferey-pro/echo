import React, { useState, useMemo, useRef } from 'react';
import type { ApiRequest, BrunoFolder } from '../../lib/parser';
import { cn } from '@/lib/utils';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { ChevronRight, Folder, FolderOpen, Star, RefreshCw, Library, Settings, Zap } from 'lucide-react';

import { useStore } from '../../store/useStore';

interface RequestListProps {
  onOpenSettings: () => void;
  onOpenCollections: () => void;
}

const methodStyles: Record<string, string> = {
  GET: 'neo:bg-neo-green bg-green-400 text-black',
  POST: 'neo:bg-neo-blue bg-blue-400 text-black',
  PUT: 'neo:bg-neo-yellow bg-yellow-400 text-black',
  PATCH: 'neo:bg-neo-orange bg-orange-400 text-black',
  DELETE: 'neo:bg-neo-pink bg-pink-400 text-black',
};

type ListItem = 
  | { type: 'starred-header', isExpanded: boolean }
  | { type: 'starred-request', request: ApiRequest }
  | { type: 'folder', folder: BrunoFolder, depth: number, isExpanded: boolean }
  | { type: 'request', request: ApiRequest, depth: number };

export function RequestList({ onOpenSettings, onOpenCollections }: RequestListProps) {
  const { folders, requests, selectedRequestId, selectedFolderId, setSelectedRequestId, setSelectedFolderId, loadCollection } = useStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (setSelectedFolderId) setSelectedFolderId(folderId);
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

  // eslint-disable-next-line react-hooks/incompatible-library
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
          className="flex items-center px-2 hover:bg-accent active:scale-[0.99] cursor-pointer text-xs text-foreground transition-colors font-semibold select-none group"
        >
          <ChevronRight 
            className={cn("w-3.5 h-3.5 mr-1 text-muted-foreground transition-transform duration-200", item.isExpanded && "rotate-90")} 
          />
          <Star className="w-3.5 h-3.5 mr-1.5 text-yellow-500" fill="currentColor" />
          <span className="truncate" style={{ textShadow: '0 0 8px var(--color-neo-pink)' }}>Mes Favoris</span>
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
          className={cn(
            "flex items-center pr-2 cursor-pointer text-xs transition-colors font-medium select-none group relative",
            selectedFolderId === item.folder.id ? "neo:bg-neo-blue/20 bg-primary/10 text-foreground font-bold" : "hover:bg-accent text-foreground/80 active:scale-[0.99]"
          )}
        >
          <div style={{ paddingLeft }} className="flex items-center w-full h-full relative">
            {/* Indentation guide lines */}
            {Array.from({ length: item.depth }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50 group-hover:bg-border transition-colors" style={{ left: `${(i + 1) * 1.1 - 0.15}rem` }} />
            ))}
            <ChevronRight 
              className={cn("w-3.5 h-3.5 mr-1 text-muted-foreground transition-transform duration-200 z-10", item.isExpanded && "rotate-90")} 
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
          onClick={() => setSelectedRequestId(req.id)}
          className={cn(
            "flex items-center pr-2 cursor-pointer text-xs transition-colors select-none group relative border-l-2",
            selectedRequestId === req.id 
              ? "neo:bg-neo-blue/30 bg-primary/20 text-foreground font-bold" 
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground border-transparent"
          )}
        >
          <div style={{ paddingLeft }} className="flex items-center w-full h-full relative">
             {/* Indentation guide lines */}
            {Array.from({ length: depth }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50 group-hover:bg-border transition-colors" style={{ left: `${(i + 1) * 1.1 - 0.15}rem` }} />
            ))}
            
            <span className={cn("neo-badge text-[10px] w-16 text-center shrink-0 z-10 mr-2", methodStyles[req.method] || 'bg-slate-200 text-slate-500')}>
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
    <div className="h-full bg-card/50 flex flex-col font-sans">
      <div className="p-3 bg-transparent flex items-center gap-2">
        <h2 className="text-xs font-black text-foreground tracking-wide uppercase flex-1">Filtres</h2>
        <span className="text-[10px] neo-badge neo:bg-neo-yellow bg-yellow-400 text-black">
           {requests.length}
        </span>
        <div className="flex items-center gap-1 border-l neo:border-l-2 border-border neo:border-neo-border pl-2 ml-1">
          <button 
            onClick={loadCollection}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Actualiser la collection"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onOpenCollections}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Gérer les Collections"
          >
            <Library className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Paramètres de la Collection"
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
