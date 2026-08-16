import React, { useState, useEffect } from 'react';
import { SplashScreen } from './SplashScreen';
import { RequestList } from '../dashboard/RequestList';
import { RequestDetails } from '../dashboard/RequestDetails';
import { fetchCollection, getSettings, updateSetting } from '../../lib/api';
import type { BrunoFolder, ApiRequest, BrunoEnvironment } from '../../lib/parser';
import { ScenarioPanel } from '../dashboard/ScenarioPanel';
import { ScenarioEditor } from '../dashboard/ScenarioEditor';

import { SettingsModal } from '../dashboard/SettingsModal';
import { CollectionSettingsModal } from '../dashboard/CollectionSettingsModal';
import { CollectionManagerModal } from '../dashboard/CollectionManagerModal';
import { CommandPalette } from '../dashboard/CommandPalette';
import { EnvironmentViewerModal } from '../dashboard/EnvironmentViewerModal';
import { useStore } from '../../store/useStore';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '../ThemeToggle';
import { Settings, CloudDownload, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function DashboardLayout() {
  const {
    folders,
    requests,
    environments,
    activeEnvironment,
    isLoading,
    selectedRequestId,
    selectedFolderId,
    selectedScenarioId,
    setActiveEnvironment,
    setSelectedFolderId,
    setSelectedRequestId,
    setSelectedScenarioId,
    loadCollection
  } = useStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollectionSettingsOpen, setIsCollectionSettingsOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEnvViewerOpen, setIsEnvViewerOpen] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ isSynced: true, commitsBehind: 0, error: "" });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/sync/status?fetch=true');
        if (res.ok) {
          const data = await res.json();
          setSyncStatus(data);
        }
      } catch {
        // ignore
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleGitSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('http://localhost:3000/api/sync/pull', { method: 'POST' });
      if (res.ok) {
        setSyncStatus(prev => ({ ...prev, commitsBehind: 0, isSynced: true }));
        loadCollection(); // Recharger la collection après le sync
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la synchronisation Git");
      }
    } catch {
      toast.error("Erreur réseau lors de la synchronisation Git");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const handleEnvChange = (val: string) => {
    setActiveEnvironment(val);
  };

  const selectedRequest = requests.find(r => r.id === selectedRequestId) || null;
  
  const getDescendantFolderIds = (folderList: BrunoFolder[], targetId: string): string[] => {
    const result: string[] = [];
    const findFolder = (list: BrunoFolder[]): BrunoFolder | null => {
      for (const f of list) {
        if (f.id === targetId) return f;
        if (f.children) {
          const found = findFolder(f.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const targetFolder = findFolder(folderList);
    if (!targetFolder) return [targetId];
    
    const collectIds = (folder: BrunoFolder) => {
      result.push(folder.id);
      if (folder.children) {
        folder.children.forEach(collectIds);
      }
    };
    
    collectIds(targetFolder);
    return result;
  };

  const targetFolderIds = selectedFolderId ? getDescendantFolderIds(folders, selectedFolderId) : [];
  const requestsInSelectedFolder = selectedFolderId ? requests.filter(r => targetFolderIds.includes(r.folderId)) : requests;
  
  const getFolderName = (folderList: BrunoFolder[], id: string | null): string => {
    if (!id || id === 'root') return 'Toutes les requêtes';
    for (const f of folderList) {
      if (f.id === id) return f.name;
      if (f.children) {
        const found = getFolderName(f.children, id);
        if (found !== 'Toutes les requêtes') return found;
      }
    }
    return 'Toutes les requêtes';
  };
  
  const selectedFolderName = getFolderName(folders, selectedFolderId);

  const isPayloadModified = (req: ApiRequest) => {
    const getPayloadStr = (data: unknown) => {
      if (typeof data === 'string') return data;
      if (data === null || data === undefined) return '';
      return JSON.stringify(data, null, 2);
    };
    const defaultPayload = getPayloadStr(req.examples?.[0]?.response?.body?.data);
    return req.currentPayload !== defaultPayload;
  };

  useEffect(() => {
    if (selectedRequest && selectedRequest.folderId !== selectedFolderId && selectedRequest.folderId !== 'root') {
      setSelectedFolderId(selectedRequest.folderId);
    }
  }, [selectedRequest, selectedFolderId, setSelectedFolderId]);

  const showSplash = isLoading || !splashAnimationDone;

  if (showSplash) {
    return <SplashScreen onComplete={() => setSplashAnimationDone(true)} />;
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 text-foreground overflow-hidden flex flex-col font-sans selection:bg-neo-pink selection:text-black">
      
      {/* Header Néo-brutaliste */}
      <div className="flex-none px-4 py-3 bg-card border-b neo:border-b-4 border-border neo:border-neo-border flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black tracking-tight">Echo</h1>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-[10px] neo-badge theme-neobrutalism:bg-neo-yellow bg-yellow-400 text-black">ENV</span>
            <Select value={activeEnvironment} onValueChange={handleEnvChange}>
              <SelectTrigger className="w-[150px] h-9 text-sm neo-button-sm bg-white text-black focus:ring-0">
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent className="neo-select-content bg-white">
                <SelectItem value="">Aucun</SelectItem>
                {environments.map(env => (
                  <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setIsEnvViewerOpen(true)}
              className="ml-1 p-1.5 neo-button-sm theme-neobrutalism:bg-neo-green bg-green-400 text-black"
              title="Voir les variables d'environnement"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="ml-2 p-1.5 neo-button-sm theme-neobrutalism:bg-neo-blue bg-blue-400 text-black"
              title="Paramètres Echo"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="mr-2 flex items-center border-r-2 border-neo-border pr-4">
            <button
              onClick={handleGitSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 neo-button-sm ${
                syncStatus.commitsBehind > 0 
                  ? 'theme-neobrutalism:bg-neo-orange bg-orange-400' 
                  : 'theme-neobrutalism:bg-neo-green bg-green-400 text-black'
              } ${isSyncing ? 'opacity-50 cursor-wait shadow-none translate-y-[2px]' : ''}`}
              title="Cliquer pour forcer la synchronisation avec Git"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : syncStatus.commitsBehind > 0 ? (
                <CloudDownload className="w-4 h-4" />
              ) : (
                <CloudDownload className="w-4 h-4 opacity-50" />
              )}
              <span className="text-xs">
                {syncStatus.commitsBehind > 0 
                  ? `${syncStatus.commitsBehind} Maj en attente` 
                  : 'Synchro OK'}
              </span>
            </button>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Grid 3 colonnes */}
      <div className="flex-1 min-h-0 w-full p-4 grid grid-cols-1 md:grid-cols-[280px_350px_1fr] xl:grid-cols-[300px_400px_1fr] gap-6">
        
        {/* Colonne 1 : Collection & Scénarios */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
          <div className="neo-box flex-1 flex flex-col overflow-hidden">
            <div className="neo:bg-neo-blue bg-muted p-2 border-b neo:border-b-2 border-border neo:border-neo-border">
              <h2 className="font-bold neo:font-black text-sm uppercase neo:dark:text-black">Collection Bruno</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <RequestList 
                onOpenSettings={() => setIsCollectionSettingsOpen(true)}
                onOpenCollections={() => setIsCollectionsOpen(true)}
              />
            </div>
          </div>

          <div className="neo-box h-1/3 flex flex-col overflow-hidden">
             <div className="neo:bg-neo-green bg-muted p-2 border-b neo:border-b-2 border-border neo:border-neo-border">
              <h2 className="font-bold neo:font-black text-sm uppercase neo:dark:text-black">Scénarios Rapides</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScenarioPanel />
            </div>
          </div>
        </div>

        {/* Colonne 2 : Liste des requêtes du dossier */}
        <div className="neo-box flex flex-col h-full overflow-hidden">
           <div className="bg-card p-3 border-b neo:border-b-2 border-border neo:border-neo-border flex justify-between items-center">
              <h2 className="font-bold neo:font-black text-lg uppercase truncate">REQUÊTES : {selectedFolderName}</h2>
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
                 {isPayloadModified(req) && <span className="neo-badge neo:bg-neo-yellow neo:text-black">Payload Surchargé</span>}
                 {req.isMocked && !isPayloadModified(req) && <span className="neo-badge neo:bg-neo-green neo:text-black">Mock Actif</span>}
               </div>
             ))}
           </div>
        </div>

        {/* Colonne 3 : Édition */}
        <div className="neo-box flex flex-col h-full overflow-hidden">
           <div className="bg-card p-3 border-b neo:border-b-2 border-border neo:border-neo-border">
              <h2 className="font-bold neo:font-black text-lg uppercase truncate">ÉDITION DU MOCK : {selectedRequest?.name || 'Aucune Sélection'}</h2>
           </div>
           <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
             {selectedScenarioId ? (
               <ScenarioEditor 
                 key={selectedScenarioId}
                 scenarioId={selectedScenarioId} 
                 requests={requests}
                 onUpdate={loadCollection}
                 onClose={() => setSelectedScenarioId(null)}
               />
             ) : (
               <RequestDetails key={selectedRequest?.id} />
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
        onSaved={loadCollection}
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSaved={loadCollection} 
      />
      <CollectionSettingsModal
        isOpen={isCollectionSettingsOpen} 
        onClose={() => setIsCollectionSettingsOpen(false)} 
        onSaved={loadCollection} 
      />
      <EnvironmentViewerModal 
        isOpen={isEnvViewerOpen}
        onClose={() => setIsEnvViewerOpen(false)}
        environments={environments}
        activeEnvironmentName={activeEnvironment}
      />
    </div>
  );
}
