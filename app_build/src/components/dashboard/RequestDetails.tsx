import React, { useState, useMemo, useEffect } from 'react';
import type { ApiRequest } from '../../lib/parser';
import Editor from '@monaco-editor/react';
import { updateRequestMeta, createMockVariant, updateMockVariant, deleteMockVariant } from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MethodBadge } from '../ui/method-badge';
import { Button } from '@/components/ui/button';
import { MagnifyingGlass, Plus, Trash } from '@phosphor-icons/react';
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

import { useStore } from '../../store/useStore';

export function RequestDetails() {
  const { requests, selectedRequestId, loadCollection, activeEnvironment, environments } = useStore();
  const request = requests.find(r => r.id === selectedRequestId) || null;
  const variants = request?.variants || [];
  
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
 const [isCreateVariantOpen, setIsCreateVariantOpen] = useState(false);
 const [newVariantName, setNewVariantName] = useState("");

  // Sync active variant ID when request changes
  useEffect(() => {
    if (request && variants.length > 0) {
      if (!activeVariantId || !variants.find(v => v.id === activeVariantId)) {
        // Default to the generic variant if it exists, otherwise the first one
        const defaultVar = variants.find(v => v.id === `${request.id}-default`) || variants[0];
        setActiveVariantId(defaultVar.id);
      }
    } else {
      setActiveVariantId(null);
    }
  }, [request]);

  const activeVariant = variants.find(v => v.id === activeVariantId) || null;

  const getPayloadString = (data: unknown) => {
    if (typeof data === 'string') return data;
    if (data === null || data === undefined) return '';
    return JSON.stringify(data, null, 2);
  };

  const defaultExamplePayload = getPayloadString(request?.examples?.[0]?.response?.body?.data);
  
  // Local states for the active variant to ensure smooth typing
  const [payload, setPayload] = useState(activeVariant?.payload || defaultExamplePayload);
  const [selectedExample, setSelectedExample] = useState<string>(activeVariant?.selectedExample || request?.examples?.[0]?.name || 'custom');
  const [statusCode, setStatusCode] = useState<number>(activeVariant?.statusCode ?? 200);
  const [latencyMs, setLatencyMs] = useState<number>(activeVariant?.latencyMs ?? 0);
  const [pathParamsOverrides, setPathParamsOverrides] = useState<Record<string, string>>(activeVariant?.pathParamsOverrides || {});
  const [isSaving, setIsSaving] = useState(false);

  const isPayloadModified = payload !== defaultExamplePayload;

  // Sync local states when active variant changes
  useEffect(() => {
    if (activeVariant) {
      setPayload(activeVariant.payload || getPayloadString(request?.examples?.[0]?.response?.body?.data));
      setSelectedExample(activeVariant.selectedExample || request?.examples?.[0]?.name || 'custom');
      setStatusCode(activeVariant.statusCode ?? 200);
      setLatencyMs(activeVariant.latencyMs ?? 0);
      setPathParamsOverrides(activeVariant.pathParamsOverrides || {});
    }
  }, [activeVariantId, request]);

  const urlParams = useMemo(() => {
    if (!request?.url) return { variables: [], pathParams: [] };
    
    const vars = Array.from(request.url.matchAll(/\{\{([^}]+)\}\}/g)).map(m => m[1] as string);
    const paths = Array.from(request.url.matchAll(/:([a-zA-Z0-9_]+)/g)).map(m => m[1] as string);
    
    return {
      variables: [...new Set(vars)],
      pathParams: [...new Set(paths)]
    };
  }, [request]);

  if (!request || !activeVariant) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center text-muted-foreground space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/50">
          <MagnifyingGlass className="w-12 h-12 text-muted-foreground opacity-50" weight="duotone" />
        </div>
        <p className="font-medium">Sélectionnez une requête pour voir les détails</p>
      </div>
    );
  }

  const currentEnv = environments.find(e => e.name === activeEnvironment);
  const getEnvValue = (key: string) => {
    return currentEnv?.variables.find(v => v.name === key)?.value || 'Non défini';
  };

  const handleToggleMock = async () => {
    setIsSaving(true);
    try {
      await updateMockVariant(activeVariant.id, { isMocked: !activeVariant.isMocked, payload, statusCode, latencyMs, pathParamsOverrides });
      await loadCollection();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayload = async () => {
    setIsSaving(true);
    try {
      await updateMockVariant(activeVariant.id, { payload, selectedExample, statusCode, latencyMs, pathParamsOverrides });
      await loadCollection();
      toast.success("Variante sauvegardée");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newCode: number) => {
    setStatusCode(newCode);
    setIsSaving(true);
    try {
      await updateMockVariant(activeVariant.id, { statusCode: newCode });
      await loadCollection();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLatencyChange = async (newLatency: number) => {
    setIsSaving(true);
    try {
      await updateMockVariant(activeVariant.id, { latencyMs: newLatency });
      await loadCollection();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de latence');
    } finally {
      setIsSaving(false);
    }
  };

  const handleParamChange = async (key: string, value: string) => {
    const newOverrides = { ...pathParamsOverrides, [key]: value };
    if (!value) delete newOverrides[key];
    setPathParamsOverrides(newOverrides);
    
    setIsSaving(true);
    try {
      await updateMockVariant(activeVariant.id, { pathParamsOverrides: newOverrides });
      await loadCollection();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour des paramètres');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExampleClick = async (ex: NonNullable<ApiRequest['examples']>[0]) => {
    setSelectedExample(ex.name);
    const newPayload = getPayloadString(ex.response?.body?.data);
    setPayload(newPayload);
    setIsSaving(true);
    try {
      await updateMockVariant(activeVariant.id, { payload: newPayload, selectedExample: ex.name });
      await loadCollection();
    } catch (e: unknown) {
      toast.error("Erreur: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayloadChange = (value: string | undefined) => {
    setPayload(value || '');
    setSelectedExample('custom');
  };

  const handleToggleStar = async () => {
    setIsSaving(true);
    await updateRequestMeta(request.id, !request.isStarred);
    await loadCollection();
    setIsSaving(false);
  };

  const submitCreateVariant = async () => {
 if (!newVariantName.trim()) return;
 setIsSaving(true);
 try {
 const newId = await createMockVariant(request.id, newVariantName.trim());
 await loadCollection();
 setActiveVariantId(newId);
 toast.success("Variante créée");
 setIsCreateVariantOpen(false);
 setNewVariantName("");
 } catch (e) {
 toast.error("Erreur création variante");
 } finally {
 setIsSaving(false);
 }
 };

  const handleDeleteVariant = async () => {
    if (variants.length <= 1) {
      toast.error("Impossible de supprimer la dernière variante");
      return;
    }
    setIsSaving(true);
    try {
      await deleteMockVariant(activeVariant.id);
      await loadCollection();
      toast.success("Variante supprimée");
    } catch (e) {
      toast.error("Erreur suppression variante");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="p-4 bg-card border-b border-border z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="w-full xl:flex-1">
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <button 
              onClick={handleToggleStar}
              disabled={isSaving}
              className={`text-2xl hover:scale-110 transition-transform ${request.isStarred ? 'text-yellow-500' : 'text-slate-400'}`}
              title={request.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {request.isStarred ? '⭐' : '☆'}
            </button>
            <span className="truncate">{request.name}</span>
          </h2>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2">
              <MethodBadge method={request.method} />
              <p className="text-sm text-foreground font-bold truncate max-w-full">{request.url}</p>
            </div>
            
            {/* Variables & Path Params UI */}
            {(urlParams.variables.length > 0 || urlParams.pathParams.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-1 items-center">
                <span className="text-xs font-black uppercase mr-1">URL Params:</span>
                
                {/* Variables d'environnement (Read-only) */}
                {urlParams.variables.map(param => (
                  <div key={param} className="flex items-center overflow-hidden h-8 border border-border rounded-md bg-muted" title="Variable d'environnement (Lecture seule)">
                    <span className="text-xs font-bold px-2 py-1 border-r border-border h-full flex items-center bg-slate-200">
                      {`{{${param}}}`}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 h-full flex items-center text-muted-foreground truncate max-w-[200px]">
                      {getEnvValue(param)}
                    </span>
                  </div>
                ))}

                {/* Path Params (Modifiables) */}
                {urlParams.pathParams.map(param => (
                  <div key={param} className="flex items-center overflow-hidden h-8 border border-border rounded-md bg-background focus-within:ring-1 focus-within:ring-primary/50">
                    <span className="text-xs font-bold px-2 py-1 bg-muted border-r border-border h-full flex items-center">
                      {`:${param}`}
                    </span>
                    <Input 
                      type="text" 
                      placeholder="Default"
                      value={pathParamsOverrides[param] || ''}
                      onChange={(e) => setPathParamsOverrides({ ...pathParamsOverrides, [param]: e.target.value })}
                      onBlur={(e) => handleParamChange(param, e.target.value)}
                      className="h-full border-none shadow-none rounded-none text-xs font-bold px-2 w-24 focus-visible:ring-0 bg-transparent"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* VARIANT SELECTOR */}
        <div className="flex flex-col gap-2 shrink-0 bg-muted p-3 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase text-muted-foreground">Variante active :</span>
            <div className="flex items-center gap-1">
              <AlertDialog open={isCreateVariantOpen} onOpenChange={setIsCreateVariantOpen}>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Créer une variante">
                    <Plus weight="bold" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="shadow-lg rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold text-xl text-foreground">Créer une variante</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Nom de la nouvelle variante (ex: Erreur 404, Admin User) :
                    </AlertDialogDescription>
                    <div className="py-4">
                      <Input 
                        className="w-full"
                        autoFocus
                        placeholder="Nom de la variante" 
                        value={newVariantName} 
                        onChange={e => setNewVariantName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') submitCreateVariant();
                        }}
                      />
                    </div>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setNewVariantName('')}>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={(e) => {
                        e.preventDefault();
                        submitCreateVariant();
                      }}
                      disabled={!newVariantName.trim() || isSaving}
                    >
                      Créer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" title="Supprimer la variante" disabled={variants.length <= 1}>
                    <Trash weight="bold" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="shadow-lg rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold text-xl text-red-600">Supprimer cette variante ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Cette action supprimera définitivement cette variante. Elle ne pourra pas être annulée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteVariant}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Oui, supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <Select value={activeVariantId || ''} onValueChange={setActiveVariantId}>
            <SelectTrigger className="w-[250px] h-9 font-bold bg-white text-black shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${v.isMocked ? 'bg-green-500' : 'bg-slate-300'}`} />
                    {v.name} {v.id === `${request.id}-default` && "(Défaut)"}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>
      
      {/* ACTIONS */}
      <div className="px-4 py-3 bg-slate-50 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm z-20">
        <div className="flex items-center gap-3">
            <Button 
            onClick={handleToggleMock} 
            disabled={isSaving}
            variant={activeVariant.isMocked ? "default" : "secondary"}
            className={activeVariant.isMocked ? "bg-green-500 hover:bg-green-600 text-white font-bold" : "font-bold"}
            >
            {activeVariant.isMocked ? 'Mock Actif pour cette Variante' : 'Pass-through'}
            </Button>
            <Button 
            onClick={handleSavePayload} 
            disabled={isSaving}
            variant="outline"
            className="font-bold border-2"
            >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </Button>
        </div>
        <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
            Status global : 
            <span className={`px-2 py-1 rounded-md text-white ${activeVariant.isMocked ? 'bg-green-500' : 'bg-slate-400'}`}>
                {activeVariant.isMocked ? 'MOCK' : 'PROXY'}
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 z-10 bg-slate-50 ">
        <div className="flex flex-col h-full bg-white p-4 border border-border shadow-sm rounded-xl">
          
          <div className="flex flex-col xl:flex-row xl:items-center gap-6 mb-6 bg-muted p-4 border border-border rounded-xl">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-black uppercase">Statut :</span>
              <Select value={statusCode.toString()} onValueChange={(v) => handleStatusChange(parseInt(v))}>
                <SelectTrigger className="w-[160px] h-10 font-bold bg-white text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className=" bg-card">
                  <SelectItem value="200">🟢 200 OK</SelectItem>
                  <SelectItem value="201">🟢 201 Created</SelectItem>
                  <SelectItem value="204">🟢 204 No Content</SelectItem>
                  <SelectItem value="400">🟠 400 Bad Request</SelectItem>
                  <SelectItem value="401">🟠 401 Unauthorized</SelectItem>
                  <SelectItem value="403">🟠 403 Forbidden</SelectItem>
                  <SelectItem value="404">🟠 404 Not Found</SelectItem>
                  <SelectItem value="500">🔴 500 Internal Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="h-px xl:h-10 xl:w-px bg-border w-full xl:w-px"></div>
            
            <div className="flex flex-col flex-1 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase">Latence :</span>
                <span className="text-sm font-bold bg-card text-foreground">
                  {latencyMs} ms
                </span>
              </div>
              <input 
                type="range"
                min="0"
                max="5000"
                step="50"
                value={latencyMs}
                onChange={(e) => setLatencyMs(parseInt(e.target.value))}
                onMouseUp={() => handleLatencyChange(latencyMs)}
                onTouchEnd={() => handleLatencyChange(latencyMs)}
                className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer border-2 border-slate-300"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mb-4">
            <h3 className="text-sm font-black uppercase">Exemple MSW à Activer :</h3>
            {request.examples && request.examples.length > 0 ? (
              <Select value={selectedExample} onValueChange={(v) => {
                if (v === 'custom') {
                  setSelectedExample('custom');
                } else {
                  const ex = request.examples?.find(e => e.name === v);
                  if (ex) handleExampleClick(ex);
                }
              }}>
                <SelectTrigger className="w-full h-10 font-bold bg-white text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-border font-bold">
                  {request.examples.map(ex => (
                    <SelectItem key={ex.name} value={ex.name}>{ex.name}</SelectItem>
                  ))}
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className=" bg-slate-100 text-slate-500 font-bold">Aucun exemple disponible</div>
            )}
          </div>
          
          <h3 className="text-sm font-black uppercase mb-2 mt-4">Payload de Réponse (JSON) :</h3>
          
          <div className={`flex-1 flex flex-col rounded-xl overflow-hidden relative ${isPayloadModified ? '' : 'border border-border'}`}>
            {isPayloadModified && (
              <div className="absolute top-2 right-6 z-20 font-black text-sm text-primary pointer-events-none drop-shadow-md">
                Payload Modifié (Surcharge Locale)
              </div>
            )}
            <Editor
              height="100%"
              defaultLanguage="json"
              theme="light"
              value={payload}
              onChange={handlePayloadChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                wordWrap: "on",
                formatOnPaste: true,
                padding: { top: 32, bottom: 8 },
                lineNumbersMinChars: 3,
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true
              }}
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button 
              className="bg-muted text-foreground hover:bg-slate-200 rounded-md w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2 font-bold transition-colors"
              onClick={() => {
                setPayload(defaultExamplePayload);
                setSelectedExample(request.examples?.[0]?.name || 'custom');
              }}
            >
              <span>↺</span> Recharger l'original (Bruno Reset)
            </button>
            
            <div className="flex items-center gap-2 font-black uppercase text-sm">
              ÉTAT ACTUEL : 
              <span className={`text-sm px-3 py-1 rounded-md font-bold ${isPayloadModified ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600'}`}>
                {isPayloadModified ? 'Surchargé Localement' : 'Original Bruno'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
