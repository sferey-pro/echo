import React from 'react';
import type { BrunoEnvironment } from '../../lib/parser';

interface EnvironmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: BrunoEnvironment[];
  activeEnvironmentName: string;
}

export function EnvironmentViewerModal({ isOpen, onClose, environments, activeEnvironmentName }: EnvironmentViewerModalProps) {
  if (!isOpen) return null;

  const activeEnv = environments.find(e => e.name === activeEnvironmentName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border-2 border-neo-border rounded-xl shadow-[8px_8px_0px_black] w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="p-6 flex items-center justify-between border-b-2 border-neo-border">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <span className="text-2xl">🌍</span> Variables d'Environnement
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors font-black">✕</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {activeEnvironmentName === '' ? (
            <div className="p-8 border-2 border-dashed border-neo-border rounded-xl text-center flex flex-col items-center">
              <span className="text-3xl mb-2 opacity-80">🤷</span>
              <p className="font-bold text-foreground">Aucun environnement actif</p>
              <p className="text-xs text-muted-foreground mt-2 font-bold">Sélectionnez un environnement dans le menu déroulant en haut de l'écran pour voir ses variables.</p>
            </div>
          ) : !activeEnv ? (
            <div className="p-8 border-2 border-dashed border-neo-border rounded-xl text-center flex flex-col items-center">
              <p className="font-bold text-red-500">Environnement "{activeEnvironmentName}" introuvable.</p>
            </div>
          ) : activeEnv.variables.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-neo-border rounded-xl text-center flex flex-col items-center">
              <span className="text-3xl mb-2 opacity-80">📭</span>
              <p className="font-bold text-foreground">Aucune variable définie</p>
              <p className="text-xs text-muted-foreground mt-2 font-bold">L'environnement {activeEnv.name} ne contient aucune variable.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border-2 border-neo-border rounded-lg overflow-hidden">
              <div className="bg-neo-yellow p-3 border-b-2 border-neo-border">
                <h3 className="font-black text-black">Variables de l'environnement : {activeEnv.name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-bold">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b-2 border-neo-border">
                    <tr>
                      <th className="p-3 border-r-2 border-neo-border w-1/3 text-foreground">Nom</th>
                      <th className="p-3 text-foreground">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEnv.variables.map((v, i) => (
                      <tr key={i} className="border-b-2 border-neo-border last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-3 border-r-2 border-neo-border font-mono text-xs text-foreground">
                          {v.name}
                        </td>
                        <td className="p-3 font-mono text-xs text-foreground break-all">
                          {v.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t-2 border-neo-border flex justify-end">
          <button 
            onClick={onClose}
            className="neo-button bg-slate-200 text-black font-black px-6 py-2"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
