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
  const [selectedExample, setSelectedExample] = useState<string>(request?.selectedExample || request?.examples?.[0]?.name || 'custom');
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
    await updateMock(request.id, { payload, selectedExample });
    onUpdate?.();
    setIsSaving(false);
  };

  const handleExampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedExample(val);
    if (val !== 'custom') {
      const ex = request.examples?.find(ex => ex.name === val);
      if (ex && ex.response?.body?.data) {
        setPayload(ex.response.body.data);
      }
    }
  };

  const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPayload(e.target.value);
    setSelectedExample('custom');
  };

  const handleToggleStar = async () => {
    setIsSaving(true);
    await updateMock(request.id, { isStarred: !request.isStarred });
    onUpdate?.();
    setIsSaving(false);
  };

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden">
      
      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-2xl z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <button 
              onClick={handleToggleStar}
              disabled={isSaving}
              className={`text-xl hover:scale-110 transition-transform ${request.isStarred ? 'text-yellow-400' : 'text-neutral-600 hover:text-yellow-400/50'}`}
              title={request.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {request.isStarred ? '⭐' : '☆'}
            </button>
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
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleToggleMock} 
            disabled={isSaving}
            variant={request.isMocked ? "default" : "outline"} 
            size="sm" 
            className={`h-9 font-medium transition-all active:scale-95 ${request.isMocked ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 border-green-400/50' : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'}`}>
            {request.isMocked ? 'Mock Actif' : 'Pass-through'}
          </Button>
          <Button 
            onClick={handleSavePayload} 
            disabled={isSaving}
            size="sm" 
            className="h-9 font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-95 border border-white/10">
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder Payload'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 z-10">
        <div className="flex flex-col h-full bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-neutral-200">Payload de Réponse JSON</h3>
              {request.examples && request.examples.length > 0 && (
                <select 
                  value={selectedExample}
                  onChange={handleExampleChange}
                  className="bg-black/40 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="custom">Custom Payload</option>
                  {request.examples.map(ex => (
                    <option key={ex.name} value={ex.name}>{ex.name}</option>
                  ))}
                </select>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-3 rounded-full bg-white/5 text-xs text-neutral-400 hover:text-white hover:bg-white/10 transition-all" onClick={() => {
              setPayload(defaultExamplePayload);
              setSelectedExample(request.examples?.[0]?.name || 'custom');
            }}>
              Reset (Bruno)
            </Button>
          </div>
          <Textarea 
            className="flex-1 font-mono text-sm bg-black/40 border-white/5 text-green-400 resize-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50 shadow-inner p-4 rounded-lg transition-all"
            value={payload}
            onChange={handlePayloadChange}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
