import React, { useState, useEffect } from 'react';
import type { BrunoEnvironment } from '../../../shared/lib/parser';
import { GlobeHemisphereWest, Question, Tray } from '@phosphor-icons/react';

interface EnvironmentViewerModalProps {
 isOpen: boolean;
 onClose: () => void;
 environments: BrunoEnvironment[];
 activeEnvironmentName: string;
}

export function EnvironmentViewerModal({ isOpen, onClose, environments, activeEnvironmentName }: EnvironmentViewerModalProps) {
 const [searchTerm, setSearchTerm] = useState('');

 useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen) {
  onClose();
  }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isOpen, onClose]);

 if (!isOpen) return null;

 const activeEnv = environments.find(e => e.name === activeEnvironmentName);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
 <div className="bg-background border border-border rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[85vh]">
 <div className="p-6 flex items-center justify-between border-b border-border">
 <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
 <GlobeHemisphereWest className="w-7 h-7 text-primary" weight="fill" /> Variables d'Environnement
 </h2>
 <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
 </div>

 <div className="p-6 flex-1 overflow-y-auto">
 {activeEnvironmentName === '' ? (
 <div className="p-8 border border-dashed border-border rounded-xl text-center flex flex-col items-center">
 <Question className="w-10 h-10 mb-3 text-muted-foreground opacity-80" weight="duotone" />
 <p className="font-semibold text-foreground">Aucun environnement actif</p>
 <p className="text-xs text-muted-foreground mt-2 font-medium">Sélectionnez un environnement dans le menu déroulant en haut de l'écran pour voir ses variables.</p>
 </div>
 ) : !activeEnv ? (
 <div className="p-8 border border-dashed border-border rounded-xl text-center flex flex-col items-center">
 <p className="font-medium text-red-500">Environnement "{activeEnvironmentName}" introuvable.</p>
 </div>
 ) : activeEnv.variables.length === 0 ? (
 <div className="p-8 border border-dashed border-border rounded-xl text-center flex flex-col items-center">
 <Tray className="w-10 h-10 mb-3 text-muted-foreground opacity-80" weight="duotone" />
 <p className="font-semibold text-foreground">Aucune variable définie</p>
 <p className="text-xs text-muted-foreground mt-2 font-medium">L'environnement {activeEnv.name} ne contient aucune variable.</p>
 </div>
 ) : (
 <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
 <div className="bg-muted/50 p-3 border-b border-border">
 <h3 className="font-semibold text-foreground">Variables de l'environnement : {activeEnv.name}</h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm font-medium">
 <thead className="bg-muted border-b border-border">
 <tr>
 <th className="p-3 border-r border-border w-1/3 text-foreground">Nom</th>
 <th className="p-3 text-foreground">Valeur</th>
 </tr>
 </thead>
 <tbody>
 {activeEnv.variables.map((v, i) => (
 <tr key={i} className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
 <td className="p-3 border-r border-border font-mono text-xs text-foreground">
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

 <div className="p-4 border-t border-border flex justify-end">
 <button 
 onClick={onClose}
 className="bg-secondary text-secondary-foreground font-medium px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors"
 >
 Fermer
 </button>
 </div>
 </div>
 </div>
 );
}
