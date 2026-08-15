import React, { useState, useEffect } from 'react';
import type { ApiRequest } from '../../lib/parser';
import { Button } from '@/components/ui/button';
import { fetchScenarios, updateScenario } from '../../lib/api';
import type { Scenario } from '../../lib/api';

interface ScenarioEditorProps {
  scenarioId: string;
  requests: ApiRequest[];
  onUpdate?: () => void;
  onClose: () => void;
}

export function ScenarioEditor({ scenarioId, requests, onUpdate, onClose }: ScenarioEditorProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [name, setName] = useState('');
  const [actions, setActions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const scens = await fetchScenarios();
        const sc = scens.find(s => s.id === scenarioId);
        if (sc) {
          setScenario(sc);
          setName(sc.name);
          setActions(sc.actions);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    load();
  }, [scenarioId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateScenario(scenarioId, name, actions);
      onUpdate?.();
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  const addAction = (req: ApiRequest) => {
    if (actions.find(a => a.requestId === req.id)) return; // Already exists
    const newAction = {
      requestId: req.id,
      isMocked: true,
      statusCode: 200,
      latencyMs: 0,
      payload: req.examples?.[0]?.response?.body?.data || '',
      selectedExample: req.examples?.[0]?.name || null,
      pathParamsOverrides: {}
    };
    setActions([...actions, newAction]);
    setSearchQuery('');
    setIsAdding(false);
  };

  const updateAction = (index: number, updates: any) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    const newActions = [...actions];
    newActions.splice(index, 1);
    setActions(newActions);
  };

  const filteredRequests = requests.filter(r => 
    !actions.find(a => a.requestId === r.id) &&
    (r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     r.url.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 10);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><p className="text-neutral-500">Chargement...</p></div>;
  }

  if (!scenario) {
    return <div className="h-full flex items-center justify-center"><p className="text-neutral-500">Scénario introuvable</p></div>;
  }

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-2xl z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0">
        <div className="flex-1 w-full">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Éditer le scénario</h2>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-xl font-bold text-white tracking-tight bg-transparent border-b border-transparent hover:border-white/20 focus:border-purple-500 focus:outline-none px-0 py-1 w-full max-w-md transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 text-neutral-400 hover:text-white">
            Fermer
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            size="sm" 
            className="h-9 font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 z-10">
        
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-neutral-300">Requêtes Mockées ({actions.length})</h3>
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            size="sm" 
            className="h-8 bg-white/10 hover:bg-white/20 text-white"
          >
            {isAdding ? 'Annuler' : '+ Ajouter une requête'}
          </Button>
        </div>

        {isAdding && (
          <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
            <input 
              autoFocus
              type="text" 
              placeholder="Rechercher une requête (nom, url)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 w-full"
            />
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {filteredRequests.map(req => (
                <button 
                  key={req.id} 
                  onClick={() => addAction(req)}
                  className="flex flex-col items-start p-2 hover:bg-purple-500/20 rounded transition-colors text-left"
                >
                  <span className="text-sm text-neutral-200 font-medium">{req.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono bg-neutral-800 text-neutral-400 px-1 py-0.5 rounded">{req.method}</span>
                    <span className="text-xs text-neutral-500 font-mono">{req.url}</span>
                  </div>
                </button>
              ))}
              {filteredRequests.length === 0 && searchQuery && (
                <p className="text-xs text-neutral-500 text-center py-2">Aucune requête trouvée.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {actions.length === 0 ? (
            <div className="p-8 border border-dashed border-white/10 rounded-xl text-center flex flex-col items-center">
              <span className="text-3xl opacity-50 mb-2">👻</span>
              <p className="text-sm text-neutral-400">Ce scénario est vide.</p>
              <p className="text-xs text-neutral-500">Ajoutez des requêtes pour configurer leurs réponses.</p>
            </div>
          ) : (
            actions.map((action, index) => {
              const req = requests.find(r => r.id === action.requestId);
              return (
                <div key={index} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                  
                  {/* Header de l'action */}
                  <div className="p-3 bg-black/20 flex items-center justify-between border-b border-white/5">
                    <div className="flex flex-col gap-1 truncate pr-4">
                      <span className="text-sm font-semibold text-neutral-200 truncate">{req?.name || 'Requête inconnue'}</span>
                      {req && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-neutral-800 text-neutral-400 px-1 py-0.5 rounded">{req.method}</span>
                          <span className="text-[10px] text-neutral-500 font-mono truncate">{req.url}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => removeAction(index)}
                      variant="ghost" size="sm" className="h-8 w-8 p-0 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 shrink-0"
                    >
                      ×
                    </Button>
                  </div>

                  {/* Contrôles Rapides */}
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-neutral-400 w-16">Statut</span>
                      <select 
                        value={action.statusCode}
                        onChange={(e) => updateAction(index, { statusCode: parseInt(e.target.value) })}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs font-medium text-white focus:outline-none w-full"
                      >
                        <option value={200}>🟢 200 OK</option>
                        <option value={201}>🟢 201 Created</option>
                        <option value={204}>🟢 204 No Content</option>
                        <option value={400}>🟠 400 Bad Request</option>
                        <option value={401}>🟠 401 Unauthorized</option>
                        <option value={403}>🟠 403 Forbidden</option>
                        <option value={404}>🟠 404 Not Found</option>
                        <option value={500}>🔴 500 Internal Error</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-neutral-400 w-16">Latence</span>
                      <div className="flex-1 flex items-center gap-2">
                        <input 
                          type="range" min="0" max="5000" step="50"
                          value={action.latencyMs}
                          onChange={(e) => updateAction(index, { latencyMs: parseInt(e.target.value) })}
                          className="w-full accent-purple-500 h-1 bg-black/40 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-purple-400 w-10 text-right">{action.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Exemples & Payload */}
                  <div className="p-3 pt-0 flex flex-col gap-2">
                    {req?.examples && req.examples.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-400 w-16">Exemple</span>
                        <div className="flex flex-wrap gap-1">
                          {req.examples.map(ex => (
                            <button
                              key={ex.name}
                              onClick={() => updateAction(index, { selectedExample: ex.name, payload: ex.response?.body?.data || '' })}
                              className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${action.selectedExample === ex.name ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-black/40 text-neutral-400 hover:bg-white/10 border border-transparent'}`}
                            >
                              {ex.name}
                            </button>
                          ))}
                          <button
                            onClick={() => updateAction(index, { selectedExample: 'custom' })}
                            className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${action.selectedExample === 'custom' ? 'bg-white/10 text-white border border-white/20' : 'bg-black/40 text-neutral-500 hover:bg-white/5 border border-dashed border-white/10'}`}
                          >
                            Sur-mesure
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-neutral-400 mb-1 block">Payload (JSON)</span>
                      <textarea
                        value={action.payload}
                        onChange={(e) => updateAction(index, { payload: e.target.value, selectedExample: 'custom' })}
                        spellCheck={false}
                        className="w-full h-24 bg-[#1e1e1e] border border-white/5 rounded-md p-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-purple-500/50 resize-y"
                      />
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
