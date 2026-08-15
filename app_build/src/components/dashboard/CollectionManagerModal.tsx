import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, cloneCollection } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CollectionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CollectionManagerModal({ isOpen, onClose, onSaved }: CollectionManagerModalProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>('');
  const [loading, setLoading] = useState(isOpen);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/repositories');
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        getSettings(),
        fetchCollections()
      ]).then(([settings]) => {
        setActiveCollection(settings.ACTIVE_COLLECTION_NAME || 'samples-bruno');
      }).finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleClone = async (force: boolean = false) => {
    if (!repoUrl) return;
    setCloning(true);
    try {
      await cloneCollection(repoUrl, force);
      await fetchCollections();
      setRepoUrl('');
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message === 'EXISTS') {
         const confirmOverwrite = window.confirm("Ce dépôt existe déjà. Voulez-vous le supprimer et le cloner à nouveau ?");
         if (confirmOverwrite) {
            setCloning(false);
            return handleClone(true);
         }
      } else {
         console.error(err);
         alert(err.message || "Erreur lors du clonage du dépôt");
      }
    } finally {
      setCloning(false);
    }
  };

  const handleActivate = async (name: string) => {
    setLoading(true);
    try {
      await updateSetting('ACTIVE_COLLECTION_NAME', name);
      setActiveCollection(name);
      onSaved();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'activation");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la collection ${name} ?`)) return;
    try {
      await fetch(`/api/repositories/${name}`, { method: 'DELETE' });
      if (activeCollection === name) {
         // Maybe set active to something else? or leave it
      }
      await fetchCollections();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📚</span> Gestionnaire de Collections
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-sm font-medium text-neutral-200 mb-3">Cloner un nouveau dépôt Git</h3>
            <div className="flex gap-2">
              <Input 
                type="text" 
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="Ex: https://github.com/user/repo.git"
                className="flex-1 bg-black/40 border-white/10"
              />
              <Button 
                onClick={() => handleClone(false)}
                disabled={cloning || !repoUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {cloning ? 'Clonage...' : 'Cloner'}
              </Button>
            </div>
          </div>

          <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Collections Disponibles</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map(name => (
              <div 
                key={name} 
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${activeCollection === name ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white truncate w-48" title={name}>{name}</span>
                    <span className="text-xs text-neutral-500 mt-1">/collection/{name}</span>
                  </div>
                  {activeCollection === name && (
                    <span className="text-[10px] uppercase font-bold bg-purple-500 text-white px-2 py-0.5 rounded shadow-sm">Actif</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity h-8"
                    onClick={() => handleDelete(name)}
                  >
                    Supprimer
                  </Button>
                  
                  {activeCollection !== name && (
                    <Button 
                      variant="default"
                      size="sm"
                      className="bg-white/10 text-white hover:bg-white/20 ml-auto h-8"
                      onClick={() => handleActivate(name)}
                      disabled={loading}
                    >
                      Activer
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {collections.length === 0 && (
              <div className="col-span-full py-8 text-center text-neutral-500 bg-white/5 rounded-lg border border-dashed border-white/10">
                Aucune collection trouvée. Clonez un dépôt ci-dessus.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
