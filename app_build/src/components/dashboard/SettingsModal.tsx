import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting } from '../../lib/api';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [targetApiUrl, setTargetApiUrl] = useState('');
  const [loading, setLoading] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      getSettings().then(settings => {
        setTargetApiUrl(settings.TARGET_API_URL || '');
      }).finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (targetApiUrl !== undefined) await updateSetting('TARGET_API_URL', targetApiUrl);
      onSaved();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      const { resetApplication } = await import('../../lib/api');
      await resetApplication();
      toast.success("Application réinitialisée avec succès !");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la réinitialisation");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border-2 border-neo-border rounded-xl shadow-[8px_8px_0px_black] w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-foreground">Paramètres de l'Application Echo</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-black">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-foreground/80 mb-1">
                  Target API URL
                </label>
                <input 
                  type="text" 
                  value={targetApiUrl}
                  onChange={e => setTargetApiUrl(e.target.value)}
                  placeholder="Ex: http://localhost:8080"
                  className="neo-input w-full bg-white dark:bg-slate-800 text-sm text-foreground focus:outline-none"
                />
                <p className="text-xs text-muted-foreground mt-1 font-bold">L'URL vers laquelle le proxy redirige les requêtes non-mockées.</p>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-neo-border">
              <h3 className="text-sm font-black text-red-500 mb-2">Zone de Danger</h3>
              <p className="text-xs font-bold text-muted-foreground mb-4">Attention, cette action supprimera tous vos mocks actifs, configurations et scénarios. La collection redeviendra vierge.</p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button 
                    type="button" 
                    className="neo-button bg-neo-red text-black text-sm px-4 py-2 w-full font-black hover:bg-red-500"
                  >
                    Réinitialiser complètement l'application
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-2 border-neo-border shadow-[8px_8px_0px_black] rounded-none">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black text-xl text-red-600">Réinitialisation complète</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold text-black dark:text-white">
                      Êtes-vous absolument sûr de vouloir réinitialiser l'application ? Tout votre travail en cours (mocks, scénarios) sera définitivement perdu.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="neo-button bg-slate-200 text-black font-black">Annuler</AlertDialogCancel>
                    <AlertDialogAction type="button" onClick={handleReset} className="neo-button bg-neo-red text-black font-black hover:bg-red-500">
                      Oui, réinitialiser
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
              className="neo-button bg-slate-200 text-black px-4 py-2 text-sm font-black transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="neo-button bg-neo-blue text-black px-4 py-2 text-sm font-black transition-colors disabled:opacity-50"
            >
              {loading ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
