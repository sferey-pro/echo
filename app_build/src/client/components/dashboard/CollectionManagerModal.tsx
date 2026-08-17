import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, cloneCollection } from '../../lib/api';
import { toast } from 'sonner';
import { Button } from '@/client/components/ui/button';
import { Input } from '@/client/components/ui/input';
import { Books } from '@phosphor-icons/react';
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";

interface CollectionManagerModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSaved: () => void | Promise<void>;
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
 setActiveCollection(settings.ACTIVE_COLLECTION_NAME || '');
 }).finally(() => setLoading(false));
 }
 }, [isOpen]);

 useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen) {
  onClose();
  }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isOpen, onClose]);

 const handleClone = async (force: boolean = false) => {
 if (!repoUrl) return;
 setCloning(true);
 try {
 const repoName = await cloneCollection(repoUrl, force);
 await fetchCollections();
 setRepoUrl('');
 toast.success("Dépôt cloné avec succès");
 if (repoName) {
 await handleActivate(repoName);
 }
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
 await onSaved();
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
 <div className="bg-background border border-border rounded-xl shadow-lg w-full max-w-3xl flex flex-col max-h-[85vh]">
 <div className="p-6 flex items-center justify-between border-b border-border">
 <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
 <Books className="w-7 h-7 text-primary" weight="fill" /> Gestionnaire de Collections
 </h2>
 <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
 </div>

 <div className="p-6 flex-1 overflow-y-auto">
 <div className="mb-8 p-4 bg-card rounded-xl border border-border shadow-sm">
 <h3 className="text-sm font-semibold text-foreground mb-3">Cloner un nouveau dépôt Git</h3>
 <div className="flex gap-2">
 <Input 
 type="text" 
 value={repoUrl}
 onChange={e => setRepoUrl(e.target.value)}
 placeholder="Ex: https://github.com/user/repo.git"
 className="flex-1"
 />
 <Button 
 onClick={() => handleClone(false)}
 disabled={cloning || !repoUrl}
 >
 {cloning ? 'Clonage...' : 'Cloner'}
 </Button>
 </div>
 </div>

 <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Collections Disponibles</h3>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {collections.map(name => (
 <div 
 key={name} 
 className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${activeCollection === name ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border hover:shadow-md'}`}
 >
 <div className="flex justify-between items-start mb-4">
 <div className="flex flex-col">
 <span className="font-medium text-foreground truncate w-48" title={name}>{name}</span>
 <span className="text-xs font-medium text-muted-foreground mt-1">/collection/{name}</span>
 </div>
 {activeCollection === name && (
 <span className="text-[10px] uppercase font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">Actif</span>
 )}
 </div>
 
 <div className="flex justify-between items-center mt-2">
 <Button 
 variant="ghost"
 size="sm"
 className="text-destructive font-medium hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
 onClick={() => handleDelete(name)}
 >
 Supprimer
 </Button>
 
 {activeCollection === name ? (
 <Button 
 size="sm"
 variant="secondary"
 className="ml-auto"
 onClick={() => handleActivate('')}
 disabled={loading}
 >
 {loading ? 'En cours...' : 'Désactiver'}
 </Button>
 ) : (
 <Button 
 size="sm"
 className="ml-auto"
 onClick={() => handleActivate(name)}
 disabled={loading}
 >
 {loading ? 'Activation...' : 'Activer'}
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
 <AlertDialogContent className="shadow-lg rounded-xl">
 <AlertDialogHeader>
 <AlertDialogTitle className="font-bold text-xl">{confirmDialog?.title}</AlertDialogTitle>
 <AlertDialogDescription className="text-muted-foreground">
 {confirmDialog?.description}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Annuler</AlertDialogCancel>
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
