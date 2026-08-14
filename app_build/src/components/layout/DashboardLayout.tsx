import React, { useState } from 'react';
import { Sidebar } from '../dashboard/Sidebar';
import { RequestList } from '../dashboard/RequestList';
import { RequestDetails } from '../dashboard/RequestDetails';
import { FAKE_FOLDERS, FAKE_REQUESTS } from '../../mocks/fakeData';

export function DashboardLayout() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const selectedRequest = FAKE_REQUESTS.find(r => r.id === selectedRequestId) || null;

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden grid grid-cols-1 md:grid-cols-[250px_350px_1fr]">
      <Sidebar folders={FAKE_FOLDERS} />
      <RequestList 
        requests={FAKE_REQUESTS} 
        selectedRequestId={selectedRequestId} 
        onSelectRequest={setSelectedRequestId} 
      />
      <RequestDetails key={selectedRequest?.id} request={selectedRequest} />
    </div>
  );
}
