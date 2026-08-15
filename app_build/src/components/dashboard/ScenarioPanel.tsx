import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { fetchScenarios, createScenario, applyScenario, deleteScenario } from '../../lib/api';
import type { Scenario } from '../../lib/api';

interface ScenarioPanelProps {
  onScenarioApplied: () => void;
}

export function ScenarioPanel({ onScenarioApplied }: ScenarioPanelProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadScenarios = async () => {
    setIsLoading(true);
    try {
      const data = await fetchScenarios();
      setScenarios(data);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;
    setIsSaving(true);
    try {
      await createScenario(newScenarioName.trim());
      setNewScenarioName('');
      setIsCreating(false);
      await loadScenarios();
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  const handleApply = async (id: string) => {
    try {
      await applyScenario(id);
      onScenarioApplied();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce scénario ?')) return;
    try {
      await deleteScenario(id);
      await loadScenarios();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-3 border-b border-white/5 bg-white/5 shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">Mes Scénarios</h3>
        <Button 
          onClick={() => setIsCreating(!isCreating)} 
          size="sm" 
          className="h-7 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 hover:text-white"
        >
          {isCreating ? 'Annuler' : '+ Nouveau'}
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleSaveCurrent} className="p-3 border-b border-white/5 bg-black/40 flex flex-col gap-2">
          <p className="text-xs text-neutral-400">Sauvegarder l'état actuel (mocks actifs) comme un nouveau scénario.</p>
          <div className="flex gap-2">
            <input 
              autoFocus
              type="text" 
              placeholder="Nom du scénario (ex: Parcours 500)" 
              value={newScenarioName}
              onChange={e => setNewScenarioName(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
            <Button type="submit" disabled={isSaving || !newScenarioName.trim()} size="sm" className="h-8 bg-purple-600 hover:bg-purple-500 text-white">
              {isSaving ? '...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <p className="text-xs text-neutral-500 text-center p-4">Chargement...</p>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-500 space-y-2">
            <span className="text-2xl">🎭</span>
            <p className="text-xs">Aucun scénario sauvegardé.</p>
          </div>
        ) : (
          scenarios.map(scenario => (
            <div key={scenario.id} className="group flex flex-col bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg p-3 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                  <span>🎬</span> {scenario.name}
                </span>
                <span className="text-[10px] text-neutral-500 bg-black/40 px-1.5 py-0.5 rounded">
                  {scenario.actions.length} action(s)
                </span>
              </div>
              
              <div className="flex gap-2 mt-1">
                <Button 
                  onClick={() => handleApply(scenario.id)}
                  size="sm" 
                  className="flex-1 h-7 text-xs bg-white/10 hover:bg-purple-600 hover:text-white text-neutral-300 transition-colors"
                >
                  ▶ Appliquer
                </Button>
                <Button 
                  onClick={() => handleDelete(scenario.id)}
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0 text-neutral-500 hover:text-red-400 hover:bg-red-400/10"
                  title="Supprimer"
                >
                  ×
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
