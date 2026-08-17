import React, { useState, useMemo, useRef } from 'react';
import type { ApiRequest, BrunoFolder } from '../../../shared/lib/parser';
import type { MockVariantDef } from '../../../server/lib/db';
import { cn } from '@/client/lib/utils';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { CaretRight, Folder, FolderOpen, Star, ArrowsClockwise, Books, Gear, Lightning } from '@phosphor-icons/react';
import { MethodBadge } from '../ui/method-badge';
import { Button } from '@/client/components/ui/button';

import { useStore } from '../../store/useStore';

interface RequestListProps {
 onOpenSettings: () => void;
 onOpenCollections: () => void;
}



type ListItem = 
 | { type: 'starred-header', isExpanded: boolean }
 | { type: 'starred-request', request: ApiRequest }
 | { type: 'folder', folder: BrunoFolder, depth: number, isExpanded: boolean }
 | { type: 'request', request: ApiRequest, depth: number }
 | { type: 'variant', variant: MockVariantDef, request: ApiRequest, depth: number };

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
 const mockedVariants = req.variants?.filter(v => v.isMocked) || [];
 for (const v of mockedVariants) {
 items.push({ type: 'variant', variant: v, request: req, depth: 2 });
 }
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
 const mockedVariants = req.variants?.filter(v => v.isMocked) || [];
 for (const v of mockedVariants) {
 items.push({ type: 'variant', variant: v, request: req, depth: depth + 1 });
 }
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
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFolder('__starred__', e as any); }}
 tabIndex={0}
 className="flex items-center px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary hover:bg-accent active:scale-[0.99] cursor-pointer text-xs text-foreground transition-colors font-semibold select-none group"
 >
 <CaretRight 
 className={cn("w-3.5 h-3.5 mr-1 text-muted-foreground transition-transform duration-200", item.isExpanded && "rotate-90")} 
 weight="bold"
 />
 <Star className="w-3.5 h-3.5 mr-1.5 text-yellow-500" weight="fill" />
 <span className="truncate" style={{ textShadow: '0 0 8px var(--color-)' }}>Mes Favoris</span>
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
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFolder(item.folder.id, e as any); }}
 tabIndex={0}
 className={cn(
 "flex items-center pr-2 cursor-pointer text-xs transition-colors font-medium select-none group relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
 selectedFolderId === item.folder.id ? "border-l-primary bg-primary/10 text-foreground font-bold" : "hover:bg-accent text-foreground/80 active:scale-[0.99]"
 )}
 >
 <div style={{ paddingLeft }} className="flex items-center w-full h-full relative">
 {/* Indentation guide lines */}
 {Array.from({ length: item.depth }).map((_, i) => (
 <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50 group-hover:bg-border transition-colors" style={{ left: `${(i + 1) * 1.1 - 0.15}rem` }} />
 ))}
 <CaretRight 
 className={cn("w-3.5 h-3.5 mr-1 text-muted-foreground transition-transform duration-200 z-10", item.isExpanded && "rotate-90")} 
 weight="bold"
 />
 {item.isExpanded ? (
 <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-yellow-600/80 z-10" weight="fill" />
 ) : (
 <Folder className="w-3.5 h-3.5 mr-1.5 text-yellow-600/80 z-10" weight="fill" />
 )}
 <span className={cn("truncate z-10", item.folder.isObsolete && "line-through text-muted-foreground")}>{item.folder.name}</span>
 {item.folder.isObsolete && <span className="ml-2 z-10 text-[9px] uppercase font-bold tracking-wider text-red-500 border border-red-500/30 bg-red-500/10 px-1 py-0.5 rounded">Obsolète</span>}
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
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRequestId(req.id); }}
 tabIndex={0}
 className={cn(
 "flex items-center pr-2 cursor-pointer text-xs transition-colors select-none group relative border-l-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
 selectedRequestId === req.id 
 ? "border-primary bg-primary/20 text-foreground font-bold" 
 : "hover:bg-accent text-foreground border-transparent"
 )}
 >
 <div style={{ paddingLeft }} className="flex items-center w-full h-full relative">
 {/* Indentation guide lines */}
 {Array.from({ length: depth }).map((_, i) => (
 <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50 group-hover:bg-border transition-colors" style={{ left: `${(i + 1) * 1.1 - 0.15}rem` }} />
 ))}
 
 <MethodBadge method={req.method} className="z-10 mr-2" />
 <span className={cn("truncate flex-1 z-10 font-medium", req.isObsolete && "line-through text-muted-foreground")}>
 {req.isStarred && <Star className="w-3 h-3 inline mr-1 text-yellow-500" weight="fill" />}
 {req.isObsolete && <span className="text-[9px] uppercase font-bold tracking-wider text-red-500 border border-red-500/30 bg-red-500/10 px-1 py-0.5 rounded mr-1">Obsolète</span>}
 {req.name}
 </span>
 <span className="ml-2 flex items-center shrink-0 z-10">
 {req.variants?.some(v => v.isMocked) && <Lightning className="w-3 h-3 text-green-500 mr-1" weight="fill" />}
 </span>
 </div>
 </div>
 );
 }
 
 if (item.type === 'variant') {
 const req = item.request;
 const v = item.variant;
 const paddingLeft = `${item.depth * 1.1 + 1.25}rem`;
 
 return (
 <div
 key={virtualItem.key}
 style={style}
 onClick={() => setSelectedRequestId(req.id)}
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRequestId(req.id); }}
 tabIndex={0}
 className="flex items-center pr-2 cursor-pointer text-xs transition-colors select-none group relative hover:bg-slate-100 :bg-slate-800 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
 >
 <div style={{ paddingLeft }} className="flex items-center w-full h-full relative">
 {Array.from({ length: item.depth }).map((_, i) => (
 <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50 group-hover:bg-border transition-colors" style={{ left: `${(i + 1) * 1.1 - 0.15}rem` }} />
 ))}
 <Lightning className="w-3.5 h-3.5 text-green-500 mr-2 z-10" weight="fill" />
 <span className="truncate flex-1 z-10 font-medium text-muted-foreground text-[11px]">
 {v.name} ({v.statusCode})
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
 <h2 className="text-xs font-black text-foreground tracking-wide uppercase flex-1">Explorateur</h2>
 <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
 {requests.length}
 </span>
 <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
 <Button 
 variant="ghost"
 size="icon"
 onClick={() => loadCollection()}
 className="w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
 title="Actualiser la collection"
 >
 <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
 </Button>
 <Button 
 variant="ghost"
 size="icon"
 onClick={onOpenCollections}
 className="w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
 title="Gérer les Collections"
 >
 <Books className="w-3.5 h-3.5" weight="fill" />
 </Button>
 <Button 
 variant="ghost"
 size="icon"
 onClick={onOpenSettings}
 className="w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
 title="Paramètres de la Collection"
 >
 <Gear className="w-3.5 h-3.5" weight="bold" />
 </Button>
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
