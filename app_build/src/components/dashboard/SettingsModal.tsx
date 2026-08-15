import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting } from '../../lib/api';

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
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Paramètres Echo</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Target API URL
            </label>
            <input 
              type="text" 
              value={targetApiUrl}
              onChange={e => setTargetApiUrl(e.target.value)}
              placeholder="Ex: http://localhost:8080"
              className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">L'URL vers laquelle le proxy redirige les requêtes non-mockées.</p>
          </div>


          <div className="pt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
