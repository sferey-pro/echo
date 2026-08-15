import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, cloneCollection } from '../../lib/api';

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
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Paramètres Echo</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Target API URL
            </label>
            <input 
              type="text" 
              value={targetApiUrl}
              onChange={e => setTargetApiUrl(e.target.value)}
              placeholder="Ex: http://localhost:8080"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-neutral-500 mt-1">L'URL vers laquelle le proxy redirige les requêtes non-mockées.</p>
          </div>


          <div className="pt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
