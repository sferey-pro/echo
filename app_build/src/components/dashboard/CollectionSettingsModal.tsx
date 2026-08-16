import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface CollectionSettingsModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSaved: () => void;
}

export function CollectionSettingsModal({ isOpen, onClose, onSaved }: CollectionSettingsModalProps) {
 const [repoPath, setRepoPath] = useState('');
 const [gitSyncInterval, setGitSyncInterval] = useState('');
 const [loading, setLoading] = useState(isOpen);

 useEffect(() => {
 if (isOpen) {
 getSettings().then(settings => {
 setRepoPath(settings.REPO_PATH || '');
 setGitSyncInterval(settings.GIT_SYNC_INTERVAL || '300000');
 }).finally(() => setLoading(false));
 }
 }, [isOpen]);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 if (repoPath !== undefined) await updateSetting('REPO_PATH', repoPath);
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

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <div className="bg-background border-2 border- rounded-xl shadow-[8px_8px_0px_black] w-full max-w-md p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-black text-foreground">Paramètres de la Collection</h2>
 <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-black">✕</button>
 </div>

 <form onSubmit={handleSave} className="space-y-4">
 <div className="space-y-6">
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-black text-foreground/80 mb-1">
 Chemin du dépôt Git (REPO_PATH)
 </label>
 <Input 
 type="text" 
 value={repoPath}
 onChange={e => setRepoPath(e.target.value)}
 placeholder="Ex: ../collection"
 />
 <p className="text-xs font-bold text-muted-foreground mt-1">Le dossier local surveillé pour l'ingestion (collection actuelle).</p>
 </div>

 <div>
 <label className="block text-sm font-black text-foreground/80 mb-1">
 Intervalle de Synchronisation Git (ms)
 </label>
 <Input 
 type="number" 
 value={gitSyncInterval}
 onChange={e => setGitSyncInterval(e.target.value)}
 placeholder="Ex: 300000"
 />
 <p className="text-xs font-bold text-muted-foreground mt-1">Fréquence du `git fetch` automatique (par défaut: 300000ms = 5 minutes).</p>
 </div>
 </div>
 </div>

 <div className="pt-6 flex justify-end gap-2">
 <button 
 type="button" 
 onClick={onClose}
 className="bg-slate-200 text-black px-4 py-2 text-sm font-bold rounded-md transition-colors hover:bg-slate-300"
 >
 Annuler
 </button>
 <button 
 type="submit" 
 disabled={loading}
 className="bg-primary text-primary-foreground px-4 py-2 text-sm font-bold rounded-md transition-colors hover:bg-primary/90 disabled:opacity-50"
 >
 {loading ? 'Sauvegarde...' : 'Enregistrer'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
