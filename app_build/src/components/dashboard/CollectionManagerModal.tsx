import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, cloneCollection } from '../../lib/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, description: string, onConfirm: () => void } | null>(null);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      toast.success("Dépôt cloné avec succès");
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message === 'EXISTS') {
         setConfirmDialog({
           isOpen: true,
           title: 'Dépôt existant',
           description: "Ce dépôt existe déjà. Voulez-vous le supprimer et le cloner à nouveau ?",
           onConfirm: () => handleClone(true)
         });
      } else {
         console.error(err);
         toast.error(err.message || "Erreur lors du clonage du dépôt");
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
      toast.error("Erreur lors de l'activation");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la collection ?',
      description: `Êtes-vous sûr de vouloir supprimer la collection ${name} ?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/repositories/${name}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchCollections();
            toast.success("Collection supprimée");
          } else {
            toast.error("Erreur lors de la suppression");
          }
        } catch (e) {
          console.error(e);
          toast.error("Erreur lors de la suppression");
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border-2 border-neo-border rounded-xl shadow-[8px_8px_0px_black] w-full max-w-3xl flex flex-col max-h-[85vh]">
        <div className="p-6 flex items-center justify-between border-b-2 border-neo-border">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <span className="text-2xl">📚</span> Gestionnaire de Collections
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors font-black">✕</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8 p-4 bg-white dark:bg-slate-900 rounded-xl border-2 border-neo-border">
            <h3 className="text-sm font-black text-foreground mb-3">Cloner un nouveau dépôt Git</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="Ex: https://github.com/user/repo.git"
                className="neo-input flex-1 bg-white dark:bg-slate-800 text-foreground font-bold focus:outline-none"
              />
              <button 
                onClick={() => handleClone(false)}
                disabled={cloning || !repoUrl}
                className="neo-button bg-neo-blue text-black font-black px-4 py-2 disabled:opacity-50"
              >
                {cloning ? 'Clonage...' : 'Cloner'}
              </button>
            </div>
          </div>

          <h3 className="text-sm font-black text-muted-foreground mb-3 uppercase tracking-wider">Collections Disponibles</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map(name => (
              <div 
                key={name} 
                className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between group ${activeCollection === name ? 'bg-neo-yellow border-neo-border shadow-[4px_4px_0px_black]' : 'bg-white dark:bg-slate-800 border-neo-border hover:shadow-[4px_4px_0px_black]'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="font-black text-foreground truncate w-48" title={name}>{name}</span>
                    <span className="text-xs font-bold text-muted-foreground mt-1">/collection/{name}</span>
                  </div>
                  {activeCollection === name && (
                    <span className="text-[10px] uppercase font-black bg-black text-white px-2 py-0.5 shadow-sm">Actif</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <button 
                    className="text-red-500 font-bold hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                    onClick={() => handleDelete(name)}
                  >
                    Supprimer
                  </button>
                  
                  {activeCollection !== name && (
                    <button 
                      className="neo-button bg-neo-green text-black text-sm px-3 py-1 font-black ml-auto"
                      onClick={() => handleActivate(name)}
                      disabled={loading}
                    >
                      Activer
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {collections.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground bg-card rounded-lg border border-dashed border-border">
                Aucune collection trouvée. Clonez un dépôt ci-dessus.
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDialog?.isOpen} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent className="border-2 border-neo-border shadow-[8px_8px_0px_black] rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-xl">{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-black dark:text-white">
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neo-button bg-slate-200 text-black font-black">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmDialog?.onConfirm();
                setConfirmDialog(null);
              }}
              className="neo-button bg-neo-red text-black font-black hover:bg-red-500"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
