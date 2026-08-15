import React, { useState, useEffect } from 'react';
import { RequestList } from '../dashboard/RequestList';
import { RequestDetails } from '../dashboard/RequestDetails';
import { fetchCollection, getSettings, updateSetting } from '../../lib/api';
import type { BrunoFolder, ApiRequest, BrunoEnvironment } from '../../lib/parser';
import { ScenarioPanel } from '../dashboard/ScenarioPanel';
import { ScenarioEditor } from '../dashboard/ScenarioEditor';

import { SettingsModal } from '../dashboard/SettingsModal';
import { CollectionManagerModal } from '../dashboard/CollectionManagerModal';
import { CommandPalette } from '../dashboard/CommandPalette';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '../ThemeToggle';

export function DashboardLayout() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [folders, setFolders] = useState<BrunoFolder[]>([]);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [environments, setEnvironments] = useState<BrunoEnvironment[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const fetchAndSetCollection = () => {
    Promise.all([fetchCollection(), getSettings()])
      .then(([data, settings]) => {
        setFolders(data.folders);
        setRequests(data.requests);
        setEnvironments(data.environments || []);
        setActiveEnvironment(settings['ACTIVE_ENVIRONMENT'] || '');
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data", err);
        setIsLoading(false);
      });
  };

  const handleEnvChange = (val: string) => {
    setActiveEnvironment(val);
    updateSetting('ACTIVE_ENVIRONMENT', val);
  };

  useEffect(() => {
    fetchAndSetCollection();
  }, []);

  const selectedRequest = requests.find(r => r.id === selectedRequestId) || null;
  const requestsInSelectedFolder = selectedFolderId ? requests.filter(r => r.folderId === selectedFolderId) : requests;
  const selectedFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'Toutes les requêtes';

  // Find folder when a request is selected if not already matched
  useEffect(() => {
    if (selectedRequest && selectedRequest.folderId !== selectedFolderId && selectedRequest.folderId !== 'root') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFolderId(selectedRequest.folderId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest]);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-neo-bg text-foreground flex items-center justify-center">
        <div className="neo-box p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neo-border border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-lg">Lecture de la collection Bruno...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 text-foreground overflow-hidden flex flex-col font-sans selection:bg-neo-pink selection:text-black">
      
      {/* Header Néo-brutaliste */}
      <div className="flex-none px-4 py-3 bg-white dark:bg-slate-800 border-b-4 border-neo-border flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black tracking-tight">Echo</h1>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm font-bold bg-neo-yellow px-2 py-1 border-2 border-neo-border rounded-md shadow-[2px_2px_0px_black] dark:text-black">ENV</span>
            <Select value={activeEnvironment} onValueChange={handleEnvChange}>
              <SelectTrigger className="w-[150px] h-9 text-sm bg-white text-black border-2 border-neo-border rounded-md shadow-[2px_2px_0px_black] focus:ring-0 font-bold">
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent className="border-2 border-neo-border shadow-[4px_4px_0px_black] font-bold">
                <SelectItem value="">Aucun</SelectItem>
                {environments.map(env => (
                  <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Grid 3 colonnes */}
      <div className="flex-1 min-h-0 w-full p-4 grid grid-cols-1 md:grid-cols-[280px_1fr_450px] gap-6">
        
        {/* Colonne 1 : Collection & Scénarios */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
          <div className="neo-box flex-1 flex flex-col overflow-hidden">
            <div className="bg-neo-blue p-2 border-b-2 border-neo-border">
              <h2 className="font-black text-sm uppercase dark:text-black">Collection Bruno</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <RequestList 
                folders={folders}
                requests={requests} 
                selectedRequestId={selectedRequestId} 
                onSelectRequest={setSelectedRequestId}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenCollections={() => setIsCollectionsOpen(true)}
                onRefresh={fetchAndSetCollection}
              />
            </div>
          </div>

          <div className="neo-box h-1/3 flex flex-col overflow-hidden">
             <div className="bg-neo-green p-2 border-b-2 border-neo-border">
              <h2 className="font-black text-sm uppercase dark:text-black">Scénarios Rapides</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScenarioPanel 
                onScenarioApplied={fetchAndSetCollection}
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={setSelectedScenarioId}
              />
            </div>
          </div>
        </div>

        {/* Colonne 2 : Liste des requêtes du dossier */}
        <div className="neo-box flex flex-col h-full overflow-hidden">
           <div className="bg-white dark:bg-slate-800 p-3 border-b-2 border-neo-border flex justify-between items-center">
              <h2 className="font-black text-lg uppercase truncate">REQUÊTES : {selectedFolderName}</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900">
             {requestsInSelectedFolder.map((req, index) => (
               <div 
                 key={req.id} 
                 onClick={() => setSelectedRequestId(req.id)}
                 className={`neo-button flex items-center p-3 cursor-pointer ${selectedRequestId === req.id ? 'bg-neo-blue dark:bg-blue-900' : 'bg-white dark:bg-slate-800'}`}
               >
                 <span className="font-bold mr-3 text-lg">{index + 1}</span>
                 <span className={`neo-badge mr-3 bg-white dark:bg-slate-900 ${
                   req.method === 'GET' ? 'text-green-600' : 
                   req.method === 'POST' ? 'text-blue-600' : 
                   req.method === 'DELETE' ? 'text-red-600' : 'text-orange-600'
                 }`}>{req.method}</span>
                 <span className="font-bold flex-1 truncate">{req.name}</span>
                 {req.isMocked && <span className="neo-badge bg-neo-yellow text-black shadow-[2px_2px_0px_black]">Modifié Localement</span>}
               </div>
             ))}
           </div>
        </div>

        {/* Colonne 3 : Édition */}
        <div className="neo-box flex flex-col h-full overflow-hidden">
           <div className="bg-white dark:bg-slate-800 p-3 border-b-2 border-neo-border">
              <h2 className="font-black text-lg uppercase truncate">ÉDITION DU MOCK : {selectedRequest?.name || 'Aucune Sélection'}</h2>
           </div>
           <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
             {selectedScenarioId ? (
               <ScenarioEditor 
                 key={selectedScenarioId}
                 scenarioId={selectedScenarioId} 
                 requests={requests}
                 onUpdate={fetchAndSetCollection}
                 onClose={() => setSelectedScenarioId(null)}
               />
             ) : (
               <RequestDetails key={selectedRequest?.id} request={selectedRequest} onUpdate={fetchAndSetCollection} />
             )}
           </div>
        </div>
      </div>
      
      <CommandPalette 
        open={isCommandPaletteOpen}
        setOpen={setIsCommandPaletteOpen}
        requests={requests}
        onSelectRequest={setSelectedRequestId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCollectionManager={() => setIsCollectionsOpen(true)}
      />
      
      <CollectionManagerModal
        isOpen={isCollectionsOpen}
        onClose={() => setIsCollectionsOpen(false)}
        onSaved={fetchAndSetCollection}
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSaved={fetchAndSetCollection} 
      />
    </div>
  );
}
