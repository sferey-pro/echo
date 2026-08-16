import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import type { ApiRequest } from '../../lib/parser';
import { Search, Folder, Zap, Settings } from 'lucide-react';

interface CommandPaletteProps {
 open: boolean;
 setOpen: (open: boolean) => void;
 requests: ApiRequest[];
 onSelectRequest: (id: string) => void;
 onOpenSettings?: () => void;
 onOpenCollectionManager?: () => void;
}

export function CommandPalette({ open, setOpen, requests, onSelectRequest, onOpenSettings, onOpenCollectionManager }: CommandPaletteProps) {
 useEffect(() => {
 const down = (e: KeyboardEvent) => {
 if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
 e.preventDefault();
 setOpen(!open);
 }
 };

 document.addEventListener('keydown', down);
 return () => document.removeEventListener('keydown', down);
 }, [open, setOpen]);



 if (!open) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
 <div 
 className="w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
 onClick={e => e.stopPropagation()}
 >
 <Command className="w-full h-full flex flex-col bg-transparent" loop>
 <div className="flex items-center px-4 border-b border-border">
 <Search className="w-5 h-5 text-muted-foreground mr-2" />
 <Command.Input 
 autoFocus
 className="flex-1 h-14 bg-transparent text-foreground outline-none placeholder:text-muted-foreground font-medium border-none focus:ring-0" 
 placeholder="Rechercher une requête ou une commande (Cmd+K)..." 
 />
 </div>
 
 <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
 <Command.Empty className="p-4 text-sm text-center text-muted-foreground">
 Aucun résultat trouvé.
 </Command.Empty>

 <Command.Group heading="Requêtes API" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 {requests.map(req => (
 <Command.Item
 key={req.id}
 value={`${req.method} ${req.name} ${req.url}`}
 onSelect={() => {
 onSelectRequest(req.id);
 setOpen(false);
 }}
 className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-foreground cursor-pointer aria-selected:bg-primary aria-selected:text-primary-foreground transition-colors"
 >
 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
 req.method === 'GET' ? ' bg-green-400 text-black' :
 req.method === 'POST' ? ' bg-blue-400 text-black' :
 req.method === 'PUT' ? ' bg-yellow-400 text-black' :
 req.method === 'DELETE' ? ' bg-pink-400 text-black' : ' bg-orange-400 text-black'
 }`}>
 {req.method}
 </span>
 <div className="flex flex-col flex-1 overflow-hidden">
 <span className="font-medium truncate">{req.name}</span>
 <span className="text-xs opacity-60 truncate font-mono">{req.url}</span>
 </div>
 {req.isMocked && <Zap className="w-4 h-4 text-yellow-400" />}
 </Command.Item>
 ))}
 </Command.Group>

 <Command.Group heading="Commandes Système" className="px-2 py-1.5 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border pt-3">
 <Command.Item 
 onSelect={() => {
 onOpenSettings?.();
 setOpen(false);
 }}
 className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-foreground cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
 >
 <Settings className="w-4 h-4 text-muted-foreground" />
 <span>Paramètres d'Environnement</span>
 </Command.Item>
 <Command.Item 
 onSelect={() => {
 onOpenCollectionManager?.();
 setOpen(false);
 }}
 className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-foreground cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
 >
 <Folder className="w-4 h-4 text-muted-foreground" />
 <span>Gérer les Collections</span>
 </Command.Item>
 </Command.Group>

 </Command.List>
 </Command>
 </div>
 </div>
 );
}
