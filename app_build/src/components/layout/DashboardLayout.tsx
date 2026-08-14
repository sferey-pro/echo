import React, { useState, useEffect } from 'react';
import { Sidebar } from '../dashboard/Sidebar';
import { RequestList } from '../dashboard/RequestList';
import { RequestDetails } from '../dashboard/RequestDetails';
import { fetchCollection } from '../../lib/api';
import type { BrunoFolder, ApiRequest } from '../../lib/parser';

export function DashboardLayout() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [folders, setFolders] = useState<BrunoFolder[]>([]);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    <div className="h-screen w-full bg-black text-white overflow-hidden grid grid-cols-1 md:grid-cols-[250px_350px_1fr]">
      <Sidebar folders={folders} />
      <RequestList 
        requests={requests} 
        selectedRequestId={selectedRequestId} 
        onSelectRequest={setSelectedRequestId} 
      />
      <RequestDetails key={selectedRequest?.id} request={selectedRequest} />
    </div>
  );
}
