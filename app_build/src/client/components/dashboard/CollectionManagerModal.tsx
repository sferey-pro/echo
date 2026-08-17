import React, { useState, useEffect } from 'react';
import { Books } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Input } from '@/client/components/ui/input';
import { Button } from '@/client/components/ui/button';
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
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/client/components/ui/dialog";

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
 setCollections(data.repositories);
 setActiveCollection(data.activeRepository);
 }
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (isOpen) {
 fetchCollections();
 }
 }, [isOpen]);

 const handleClone = async (force: boolean = false) => {
 setCloning(true);
 try {
 const res = await fetch('/api/repositories', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ url: repoUrl, force })
 });
 
 if (res.ok) {
 toast.success("Dépôt cloné avec succès !");
 setRepoUrl('');
 await fetchCollections();
 await onSaved();
 } else {
 const err = await res.json();
 if (res.status === 409) {
 setConfirmDialog({
 isOpen: true,
 title: "Dépôt existant",
 description: err.error,
 onConfirm: () => handleClone(true)
 });
 } else {
 toast.error(err.error || "Erreur lors du clonage");
 }
 }
 } catch (e) {
 toast.error("Erreur réseau");
 } finally {
 setCloning(false);
 }
 };

 const handleActivate = async (name: string) => {
 setLoading(true);
 try {
 const res = await fetch('/api/repositories/active', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ name })
 });
 if (res.ok) {
 toast.success("Collection activée !");
 await fetchCollections();
 await onSaved();
 } else {
 toast.error("Erreur lors de l'activation");
 }
 } catch (e) {
 toast.error("Erreur réseau");
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = (name: string) => {
 setConfirmDialog({
 isOpen: true,
 title: "Supprimer la collection",
 description: `Voulez-vous vraiment supprimer le dossier de la collection "${name}" ? Cette action est irréversible.`,
 onConfirm: async () => {
 try {
 const res = await fetch(`/api/repositories/${encodeURIComponent(name)}`, {
 method: 'DELETE'
 });
 if (res.ok) {
 toast.success("Collection supprimée !");
 await fetchCollections();
 if (activeCollection === name) {
 await onSaved(); // Reload without active collection
 }
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

 return (
 <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
 <DialogContent className="sm:max-w-3xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
 <DialogHeader className="p-6 pb-4 border-b border-border bg-background">
 <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
 <Books className="w-7 h-7 text-primary" weight="fill" /> Gestionnaire de Collections
 </DialogTitle>
 </DialogHeader>

 <div className="p-6 flex-1 overflow-y-auto bg-background">
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
 </DialogContent>
 </Dialog>
 );
}
