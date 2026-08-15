import React, { useState, useEffect } from 'react';
import { RequestList } from '../dashboard/RequestList';
import { RequestDetails } from '../dashboard/RequestDetails';
import { fetchCollection } from '../../lib/api';
import type { BrunoFolder, ApiRequest } from '../../lib/parser';

import { SettingsModal } from '../dashboard/SettingsModal';

export function DashboardLayout() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [folders, setFolders] = useState<BrunoFolder[]>([]);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchAndSetCollection = () => {
    fetchCollection()
      .then(data => {
        setFolders(data.folders);
        setRequests(data.requests);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load collection", err);
        setIsLoading(false);
      });
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
        <RequestList 
          folders={folders}
          requests={requests} 
          selectedRequestId={selectedRequestId} 
          onSelectRequest={setSelectedRequestId}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <RequestDetails key={selectedRequest?.id} request={selectedRequest} onUpdate={fetchAndSetCollection} />
      </div>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSaved={fetchAndSetCollection} 
      />
    </div>
  );
}
