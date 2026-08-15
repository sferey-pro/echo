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
    <div className="h-screen w-full bg-accent text-foreground overflow-hidden flex relative font-mono selection:bg-primary selection:text-primary-foreground p-4 md:p-8">
      
      <div className="w-full h-full z-10 grid grid-cols-1 md:grid-cols-[320px_1fr] bg-background border-4 border-foreground brutal-shadow divide-x-4 divide-foreground">
        <div className="flex flex-col h-full overflow-hidden relative">
          <div className="px-4 py-3 bg-primary text-primary-foreground border-b-4 border-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest">ENV :</span>
              <Select value={activeEnvironment} onValueChange={handleEnvChange}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-background border-2 border-foreground text-foreground rounded-none brutal-shadow focus:ring-0">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground brutal-shadow">
                  <SelectItem value="">Aucun</SelectItem>
                  {environments.map(env => (
                    <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex border-b-4 border-foreground">
            <button 
              onClick={() => { setActiveTab('explorer'); setSelectedScenarioId(null); }}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider text-center transition-none border-r-4 border-foreground ${activeTab === 'explorer' ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              Explorer
            </button>
            <button 
              onClick={() => setActiveTab('scenarios')}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider text-center transition-none ${activeTab === 'scenarios' ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
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
