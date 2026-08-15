import React, { useState, useEffect } from 'react';
import { RequestList } from '../dashboard/RequestList';
import { RequestDetails } from '../dashboard/RequestDetails';
import { fetchCollection, getSettings, updateSetting } from '../../lib/api';
import type { BrunoFolder, ApiRequest, BrunoEnvironment } from '../../lib/parser';

import { SettingsModal } from '../dashboard/SettingsModal';
import { CollectionManagerModal } from '../dashboard/CollectionManagerModal';
import { CommandPalette } from '../dashboard/CommandPalette';


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

  const handleEnvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setActiveEnvironment(val);
    updateSetting('ACTIVE_ENVIRONMENT', val);
  };

  useEffect(() => {
    fetchAndSetCollection();
  }, []);

  const selectedRequest = requests.find(r => r.id === selectedRequestId) || null;

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-400 font-mono">Lecture de la collection Bruno...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#030303] text-neutral-100 overflow-hidden flex relative font-sans selection:bg-purple-500/30">
      {/* Premium Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vh] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vh] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full h-full z-10 grid grid-cols-1 md:grid-cols-[320px_1fr] divide-x divide-white/5">
        <div className="flex flex-col h-full overflow-hidden relative bg-black/20">
          <div className="px-4 py-2 bg-transparent border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">Environnement :</span>
            <select 
              value={activeEnvironment} 
              onChange={handleEnvChange}
              className="bg-black/40 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Aucun</option>
              {environments.map(env => (
                <option key={env.name} value={env.name}>{env.name}</option>
              ))}
            </select>
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
        <RequestDetails key={selectedRequest?.id} request={selectedRequest} onUpdate={fetchAndSetCollection} />
      </div>
      
      <CommandPalette 
        open={isCommandPaletteOpen}
        setOpen={setIsCommandPaletteOpen}
        requests={requests}
        folders={folders}
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
