import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import type { ApiRequest, BrunoFolder } from '../../lib/parser';
import { Search, Folder, Zap, Settings, RefreshCw } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  requests: ApiRequest[];
  folders: BrunoFolder[];
  onSelectRequest: (id: string) => void;
  onOpenSettings?: () => void;
  onOpenCollectionManager?: () => void;
}

export function CommandPalette({ open, setOpen, requests, folders, onSelectRequest, onOpenSettings, onOpenCollectionManager }: CommandPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  // Recursively find the folder path for a given request
  const getRequestPath = (req: ApiRequest) => {
    // Basic implementation - in a real scenario we'd trace the folder tree
    return req.name;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <Command className="w-full h-full flex flex-col bg-transparent" loop>
          <div className="flex items-center px-4 border-b border-neutral-800">
            <Search className="w-5 h-5 text-neutral-400 mr-2" />
            <Command.Input 
              autoFocus
              className="flex-1 h-14 bg-transparent text-white outline-none placeholder:text-neutral-500 font-medium border-none focus:ring-0" 
              placeholder="Rechercher une requête ou une commande (Cmd+K)..." 
            />
          </div>
          
          <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-neutral-700">
            <Command.Empty className="p-4 text-sm text-center text-neutral-500">
              Aucun résultat trouvé.
            </Command.Empty>

            <Command.Group heading="Requêtes API" className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {requests.map(req => (
                <Command.Item
                  key={req.id}
                  value={`${req.method} ${req.name} ${req.url}`}
                  onSelect={() => {
                    onSelectRequest(req.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-neutral-200 cursor-pointer aria-selected:bg-indigo-600 aria-selected:text-white transition-colors"
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                    req.method === 'GET' ? 'bg-blue-500' :
                    req.method === 'POST' ? 'bg-green-500' :
                    req.method === 'PUT' ? 'bg-orange-500' :
                    req.method === 'DELETE' ? 'bg-red-500' : 'bg-neutral-500'
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

            <Command.Group heading="Commandes Système" className="px-2 py-1.5 mt-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-t border-neutral-800/50 pt-3">
              <Command.Item 
                onSelect={() => {
                  onOpenSettings?.();
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-neutral-200 cursor-pointer aria-selected:bg-neutral-800 transition-colors"
              >
                <Settings className="w-4 h-4 text-neutral-400" />
                <span>Paramètres d'Environnement</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => {
                  onOpenCollectionManager?.();
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-neutral-200 cursor-pointer aria-selected:bg-neutral-800 transition-colors"
              >
                <Folder className="w-4 h-4 text-neutral-400" />
                <span>Gérer les Collections</span>
              </Command.Item>
            </Command.Group>

          </Command.List>
        </Command>
      </div>
    </div>
  );
}
