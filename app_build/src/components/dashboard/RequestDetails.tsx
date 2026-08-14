import React, { useState } from 'react';
import type { ApiRequest } from '../../lib/parser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateMock } from '../../lib/api';

interface RequestDetailsProps {
  request: ApiRequest | null;
  onUpdate?: () => void;
}

export function RequestDetails({ request, onUpdate }: RequestDetailsProps) {
  const defaultExamplePayload = request?.examples?.[0]?.response?.body?.data || '';
  const [payload, setPayload] = useState(request?.currentPayload || defaultExamplePayload);
  const [isSaving, setIsSaving] = useState(false);

  if (!request) {
    return (
      <div className="h-full bg-neutral-900 flex flex-col items-center justify-center text-neutral-500 space-y-4">
        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700/50">
          <span className="text-2xl opacity-50">🔍</span>
        </div>
        <p className="font-medium">Sélectionnez une requête pour voir les détails</p>
      </div>
    );
  }

  const handleToggleMock = async () => {
    setIsSaving(true);
    await updateMock(request.id, { isMocked: !request.isMocked, payload });
    onUpdate?.();
    setIsSaving(false);
  };

  const handleSavePayload = async () => {
    setIsSaving(true);
    await updateMock(request.id, { payload });
    onUpdate?.();
    setIsSaving(false);
  };

  return (
    <div className="h-full bg-neutral-900 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-900/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {request.name}
            {request.isMocked && (
              <span className="text-[10px] uppercase font-bold bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
                Mocked
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-mono font-bold bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700">
              {request.method}
            </span>
            <p className="text-sm text-neutral-400 font-mono truncate max-w-md">{request.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleToggleMock} 
            disabled={isSaving}
            variant={request.isMocked ? "default" : "outline"} 
            size="sm" 
            className={`h-8 ${request.isMocked ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20' : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-white'}`}>
            {request.isMocked ? 'Mock Actif' : 'Pass-through'}
          </Button>
          <Button 
            onClick={handleSavePayload} 
            disabled={isSaving}
            size="sm" 
            className="h-8 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20">
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder Payload'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 z-10">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-neutral-300">Payload de Réponse JSON</h3>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-neutral-400 hover:text-white" onClick={() => setPayload(defaultExamplePayload)}>
              Reset (Bruno)
            </Button>
          </div>
          <Textarea 
            className="flex-1 font-mono text-sm bg-neutral-950/50 border-neutral-800 text-green-400 resize-none focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500/50 shadow-inner p-4 rounded-xl"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
