import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, cloneCollection } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la collection ?',
      description: `Êtes-vous sûr de vouloir supprimer la collection ${name} ?`,
      onConfirm: async () => {
        try {
          await fetch(`/api/repositories/${name}`, { method: 'DELETE' });
          await fetchCollections();
        } catch (e) {
          console.error(e);
          alert("Erreur lors de la suppression");
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        <div className="p-6 flex items-center justify-between border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="text-2xl">📚</span> Gestionnaire de Collections
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">Cloner un nouveau dépôt Git</h3>
            <div className="flex gap-2">
              <Input 
                type="text" 
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="Ex: https://github.com/user/repo.git"
                className="flex-1 bg-background border-border text-foreground"
              />
              <Button 
                onClick={() => handleClone(false)}
                disabled={cloning || !repoUrl}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {cloning ? 'Clonage...' : 'Cloner'}
              </Button>
            </div>
          </div>

          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Collections Disponibles</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map(name => (
              <div 
                key={name} 
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${activeCollection === name ? 'bg-primary/10 border-primary/50 shadow-md shadow-primary/20' : 'bg-card border-border hover:border-primary/30'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground truncate w-48" title={name}>{name}</span>
                    <span className="text-xs text-muted-foreground mt-1">/collection/{name}</span>
                  </div>
                  {activeCollection === name && (
                    <span className="text-[10px] uppercase font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded shadow-sm">Actif</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity h-8"
                    onClick={() => handleDelete(name)}
                  >
                    Supprimer
                  </Button>
                  
                  {activeCollection !== name && (
                    <Button 
                      variant="default"
                      size="sm"
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 ml-auto h-8"
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
              <div className="col-span-full py-8 text-center text-muted-foreground bg-card rounded-lg border border-dashed border-border">
                Aucune collection trouvée. Clonez un dépôt ci-dessus.
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDialog?.isOpen} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-transparent hover:bg-muted text-foreground">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmDialog?.onConfirm();
                setConfirmDialog(null);
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
