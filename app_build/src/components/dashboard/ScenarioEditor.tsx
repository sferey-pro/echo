import React, { useState, useEffect } from 'react';
import type { ApiRequest } from '../../lib/parser';
import { Button } from '@/components/ui/button';
import { fetchScenarios, updateScenario } from '../../lib/api';
import type { Scenario, ScenarioAction } from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScenarioEditorProps {
  scenarioId: string;
  requests: ApiRequest[];
  onUpdate?: () => void;
  onClose: () => void;
}

export function ScenarioEditor({ scenarioId, requests, onUpdate, onClose }: ScenarioEditorProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [name, setName] = useState('');
  const [actions, setActions] = useState<ScenarioAction[]>([]);
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

  const updateAction = (index: number, updates: Partial<ScenarioAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates } as ScenarioAction;
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
    return <div className="h-full flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  if (!scenario) {
    return <div className="h-full flex items-center justify-center"><p className="text-muted-foreground">Scénario introuvable</p></div>;
  }

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden">
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-2xl z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0">
        <div className="flex-1 w-full">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Éditer le scénario</h2>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-xl font-bold text-foreground tracking-tight bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-0 py-1 w-full max-w-md transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 text-muted-foreground hover:text-foreground">
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
          <h3 className="text-sm font-semibold text-foreground/80">Requêtes Mockées ({actions.length})</h3>
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            size="sm" 
            className="h-8 bg-card border border-border hover:bg-accent text-foreground"
          >
            {isAdding ? 'Annuler' : '+ Ajouter une requête'}
          </Button>
        </div>

        {isAdding && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 flex flex-col gap-2">
            <input 
              autoFocus
              type="text" 
              placeholder="Rechercher une requête (nom, url)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 w-full"
            />
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {filteredRequests.map(req => (
                <button 
                  key={req.id} 
                  onClick={() => addAction(req)}
                  className="flex flex-col items-start p-2 hover:bg-primary/10 rounded transition-colors text-left"
                >
                  <span className="text-sm text-foreground font-medium">{req.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded">{req.method}</span>
                    <span className="text-xs text-muted-foreground font-mono">{req.url}</span>
                  </div>
                </button>
              ))}
              {filteredRequests.length === 0 && searchQuery && (
                <p className="text-xs text-muted-foreground text-center py-2">Aucune requête trouvée.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {actions.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-xl text-center flex flex-col items-center">
              <span className="text-3xl opacity-50 mb-2">👻</span>
              <p className="text-sm text-muted-foreground">Ce scénario est vide.</p>
              <p className="text-xs text-muted-foreground">Ajoutez des requêtes pour configurer leurs réponses.</p>
            </div>
          ) : (
            actions.map((action, index) => {
              const req = requests.find(r => r.id === action.requestId);
              return (
                <div key={index} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                  
                  {/* Header de l'action */}
                  <div className="p-3 bg-muted/30 flex items-center justify-between border-b border-border">
                    <div className="flex flex-col gap-1 truncate pr-4">
                      <span className="text-sm font-semibold text-foreground truncate">{req?.name || 'Requête inconnue'}</span>
                      {req && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded">{req.method}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{req.url}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => removeAction(index)}
                      variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      ×
                    </Button>
                  </div>

                  {/* Contrôles Rapides */}
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-16">Statut</span>
                      <Select value={action.statusCode.toString()} onValueChange={(v) => updateAction(index, { statusCode: parseInt(v) })}>
                        <SelectTrigger className="w-full h-8 bg-background border-border text-xs font-medium text-foreground focus:ring-1 focus:ring-primary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="200">🟢 200 OK</SelectItem>
                          <SelectItem value="201">🟢 201 Created</SelectItem>
                          <SelectItem value="204">🟢 204 No Content</SelectItem>
                          <SelectItem value="400">🟠 400 Bad Request</SelectItem>
                          <SelectItem value="401">🟠 401 Unauthorized</SelectItem>
                          <SelectItem value="403">🟠 403 Forbidden</SelectItem>
                          <SelectItem value="404">🟠 404 Not Found</SelectItem>
                          <SelectItem value="500">🔴 500 Internal Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-16">Latence</span>
                      <div className="flex-1 flex items-center gap-2">
                        <input 
                          type="range" min="0" max="5000" step="50"
                          value={action.latencyMs}
                          onChange={(e) => updateAction(index, { latencyMs: parseInt(e.target.value) })}
                          className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-primary w-10 text-right">{action.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Exemples & Payload */}
                  <div className="p-3 pt-0 flex flex-col gap-2">
                    {req?.examples && req.examples.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground w-16">Exemple</span>
                        <div className="flex flex-wrap gap-1">
                          {req.examples.map(ex => (
                            <button
                              key={ex.name}
                              onClick={() => updateAction(index, { selectedExample: ex.name, payload: ex.response?.body?.data || '' })}
                              className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${action.selectedExample === ex.name ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted text-muted-foreground hover:bg-accent border border-transparent'}`}
                            >
                              {ex.name}
                            </button>
                          ))}
                          <button
                            onClick={() => updateAction(index, { selectedExample: 'custom' })}
                            className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${action.selectedExample === 'custom' ? 'bg-accent text-foreground border border-border' : 'bg-muted text-muted-foreground hover:bg-accent border border-dashed border-border'}`}
                          >
                            Sur-mesure
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-muted-foreground mb-1 block">Payload (JSON)</span>
                      <textarea
                        value={action.payload}
                        onChange={(e) => updateAction(index, { payload: e.target.value, selectedExample: 'custom' })}
                        spellCheck={false}
                        className="w-full h-24 bg-background border border-border rounded-md p-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 resize-y"
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
