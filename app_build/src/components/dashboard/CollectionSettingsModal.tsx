import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting } from '../../lib/api';
import { toast } from 'sonner';
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
 AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CollectionSettingsModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSaved: () => void;
}

export function CollectionSettingsModal({ isOpen, onClose, onSaved }: CollectionSettingsModalProps) {
 const [gitSyncInterval, setGitSyncInterval] = useState('');
 const [loading, setLoading] = useState(isOpen);

 useEffect(() => {
 if (isOpen) {
 getSettings().then(settings => {
 setGitSyncInterval(settings.GIT_SYNC_INTERVAL || '300000');
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

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 if (gitSyncInterval !== undefined) await updateSetting('GIT_SYNC_INTERVAL', gitSyncInterval);
 onSaved();
 onClose();
 } catch (e: unknown) {
 console.error(e);
 toast.error("Failed to save collection settings");
 } finally {
 setLoading(false);
 }
 };

 const handleCleanup = async () => {
 setLoading(true);
 try {
 const res = await fetch('/api/sync/cleanup', { method: 'DELETE' });
 if (res.ok) {
 toast.success("Données obsolètes nettoyées !");
 onSaved(); // Reload collection
 } else {
 toast.error("Erreur lors du nettoyage.");
 }
 } catch (e) {
 toast.error("Erreur réseau lors du nettoyage.");
 } finally {
 setLoading(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <div className="bg-background border border-border rounded-xl shadow-lg w-full max-w-md p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold text-foreground">Paramètres de la Collection</h2>
 <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
 </div>

 <form onSubmit={handleSave} className="space-y-4">
 <div className="space-y-6">
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-foreground/80 mb-1">
 Intervalle de Synchronisation Git (ms)
 </label>
 <Input 
 type="number" 
 value={gitSyncInterval}
 onChange={e => setGitSyncInterval(e.target.value)}
 placeholder="Ex: 300000"
 />
 <p className="text-xs font-medium text-muted-foreground mt-1">Fréquence du `git fetch` automatique (par défaut: 300000ms = 5 minutes).</p>
 </div>
 </div>

 <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
 <h3 className="text-sm font-semibold text-red-600 mb-2">Zone Dangereuse</h3>
 <p className="text-xs text-muted-foreground mb-3">
 Supprime définitivement de la base de données toutes les requêtes et dossiers marqués comme <strong>Obsolètes</strong> (fichiers supprimés ou renommés dans Git), ainsi que leurs configurations (mocks, favoris, payloads modifiés).
 </p>
 <AlertDialog>
 <AlertDialogTrigger asChild>
 <button
 type="button"
 disabled={loading}
 className="bg-red-600 text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors hover:bg-red-700 disabled:opacity-50"
 >
 Nettoyer les données obsolètes
 </button>
 </AlertDialogTrigger>
 <AlertDialogContent className="shadow-lg rounded-xl">
 <AlertDialogHeader>
 <AlertDialogTitle className="font-bold text-xl text-red-600">Confirmer le nettoyage</AlertDialogTitle>
 <AlertDialogDescription className="text-muted-foreground">
 Voulez-vous vraiment supprimer définitivement toutes les requêtes, dossiers et environnements obsolètes (qui n'existent plus dans Git) ainsi que leurs configurations ? Cette action est irréversible.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Annuler</AlertDialogCancel>
 <AlertDialogAction 
 onClick={handleCleanup}
 className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
 >
 Oui, nettoyer
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 </div>

 <div className="pt-6 flex justify-end gap-2">
 <button 
 type="button" 
 onClick={onClose}
 className="bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-secondary/80"
 >
 Annuler
 </button>
 <button 
 type="submit" 
 disabled={loading}
 className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-primary/90 disabled:opacity-50"
 >
 {loading ? 'Sauvegarde...' : 'Enregistrer'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
