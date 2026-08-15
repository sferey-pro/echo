import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { fetchScenarios, createScenario, applyScenario, deleteScenario } from '../../lib/api';
import type { Scenario } from '../../lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useStore } from '../../store/useStore';

export function ScenarioPanel() {
  const { selectedScenarioId, setSelectedScenarioId, loadCollection } = useStore();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadScenarios = async () => {
    setIsLoading(true);
    try {
      const data = await fetchScenarios();
      setScenarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadScenarios();
  }, []);

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;
    setIsSaving(true);
    try {
      await createScenario(newScenarioName.trim(), []);
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
      loadCollection();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScenario(id);
      await loadScenarios();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-3 border-b border-border bg-card shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Mes Scénarios</h3>
        <button 
          onClick={() => setIsCreating(!isCreating)} 
          className={`neo-button text-black font-black text-xs px-2 py-1 ${isCreating ? 'bg-slate-200' : 'bg-neo-blue'}`}
        >
          {isCreating ? 'Annuler' : '+ Nouveau'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSaveCurrent} className="p-3 border-b border-border bg-muted flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Créer un nouveau scénario vide.</p>
          <div className="flex gap-2">
            <input 
              autoFocus
              type="text" 
              placeholder="Nom du scénario (ex: Parcours 500)" 
              value={newScenarioName}
              onChange={e => setNewScenarioName(e.target.value)}
              className="flex-1 bg-card border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            <Button type="submit" disabled={isSaving || !newScenarioName.trim()} size="sm" className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSaving ? '...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center p-4">Chargement...</p>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
            <span className="text-2xl">🎭</span>
            <p className="text-xs">Aucun scénario sauvegardé.</p>
          </div>
        ) : (
          scenarios.map(scenario => (
            <div 
              key={scenario.id} 
              className={`group flex flex-col hover:bg-accent border rounded-lg p-3 transition-colors cursor-pointer ${selectedScenarioId === scenario.id ? 'bg-accent border-primary/50' : 'bg-card border-border'}`}
              onClick={() => setSelectedScenarioId(scenario.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-foreground flex items-center gap-2">
                  <span>🎭</span> {scenario.name}
                </span>
              </div>
              
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleApply(scenario.id); }}
                  className="flex-1 neo-button bg-neo-yellow text-black text-xs py-1"
                >
                  ▶ Appliquer
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      onClick={(e) => { e.stopPropagation(); }}
                      size="sm" 
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Supprimer"
                    >
                      ×
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-2 border-neo-border shadow-[8px_8px_0px_black] rounded-none">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-black text-xl text-red-600">Supprimer ce scénario ?</AlertDialogTitle>
                      <AlertDialogDescription className="font-bold text-black dark:text-white">
                        Cette action supprimera définitivement le scénario "{scenario.name}". 
                        Cela n'affectera pas les requêtes de votre collection.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="neo-button bg-slate-200 text-black font-black">Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={(e) => { e.stopPropagation(); handleDelete(scenario.id); }}
                        className="neo-button bg-neo-red text-black font-black hover:bg-red-500"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
