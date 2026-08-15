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
  const [activeTab, setActiveTab] = useState<'explorer' | 'scenarios'>('explorer');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

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
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex relative font-sans selection:bg-purple-500/30">
      {/* Premium Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vh] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vh] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full h-full z-10 grid grid-cols-1 md:grid-cols-[320px_1fr] divide-x divide-border">
        <div className="flex flex-col h-full overflow-hidden relative bg-muted/10">
          <div className="px-4 py-2 bg-transparent border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Env :</span>
              <Select value={activeEnvironment} onValueChange={handleEnvChange}>
                <SelectTrigger className="w-[120px] h-7 text-xs bg-muted border-border text-foreground focus:ring-1 focus:ring-purple-500">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {environments.map(env => (
                    <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex bg-muted/30 border-b border-border">
            <button 
              onClick={() => { setActiveTab('explorer'); setSelectedScenarioId(null); }}
              className={`flex-1 py-2 text-xs font-semibold text-center transition-colors ${activeTab === 'explorer' ? 'bg-background text-foreground border-b-2 border-purple-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              Explorer
            </button>
            <button 
              onClick={() => setActiveTab('scenarios')}
              className={`flex-1 py-2 text-xs font-semibold text-center transition-colors ${activeTab === 'scenarios' ? 'bg-background text-foreground border-b-2 border-purple-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              Scénarios
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'explorer' ? (
              <RequestList 
                folders={folders}
                requests={requests} 
                selectedRequestId={selectedRequestId} 
                onSelectRequest={setSelectedRequestId}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenCollections={() => setIsCollectionsOpen(true)}
                onRefresh={fetchAndSetCollection}
              />
            ) : (
              <ScenarioPanel 
                onScenarioApplied={fetchAndSetCollection}
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={setSelectedScenarioId}
              />
            )}
          </div>
        </div>
        {activeTab === 'scenarios' && selectedScenarioId ? (
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
