import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, cloneCollection } from '../../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [targetApiUrl, setTargetApiUrl] = useState('');
  const [collectionPath, setCollectionPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getSettings().then(settings => {
        setTargetApiUrl(settings.TARGET_API_URL || '');
        setCollectionPath(settings.BRUNO_COLLECTION_PATH || '');
      }).finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (targetApiUrl !== undefined) await updateSetting('TARGET_API_URL', targetApiUrl);
      if (collectionPath !== undefined) await updateSetting('BRUNO_COLLECTION_PATH', collectionPath);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!repoUrl) return;
    setCloning(true);
    try {
      await cloneCollection(repoUrl);
      const settings = await getSettings();
      setCollectionPath(settings.BRUNO_COLLECTION_PATH || '');
      setRepoUrl('');
      alert("Dépôt cloné avec succès ! N'oubliez pas d'enregistrer.");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erreur lors du clonage du dépôt");
    } finally {
      setCloning(false);
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

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Chemin de la Collection Bruno
            </label>
            <input 
              type="text" 
              value={collectionPath}
              onChange={e => setCollectionPath(e.target.value)}
              placeholder="Ex: ../collection"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-neutral-500 mt-1">Dossier contenant les fichiers .bru (ex: chemin absolu ou relatif). Sauvegarder rechargera la collection.</p>
          </div>

          <div className="pt-2 pb-2 border-t border-neutral-800">
            <label className="block text-sm font-medium text-neutral-300 mb-1 mt-2">
              Cloner un dépôt Git (Collection Bruno)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="Ex: https://github.com/user/repo.git"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <button 
                type="button" 
                onClick={handleClone}
                disabled={cloning || !repoUrl}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                {cloning ? 'Clonage...' : 'Cloner'}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Clone le dépôt et met automatiquement à jour le chemin ci-dessus.</p>
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
