import React, { useState, useMemo, useEffect } from 'react';
import type { ApiRequest } from '../../lib/parser';
import Editor from '@monaco-editor/react';
import { updateMock } from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '../theme-provider';
import { toast } from 'sonner';

import { useStore } from '../../store/useStore';

export function RequestDetails() {
  const { requests, selectedRequestId, loadCollection } = useStore();
  const request = requests.find(r => r.id === selectedRequestId) || null;
  const getPayloadString = (data: unknown) => {
    if (typeof data === 'string') return data;
    if (data === null || data === undefined) return '';
    return JSON.stringify(data, null, 2);
  };

  const defaultExamplePayload = getPayloadString(request?.examples?.[0]?.response?.body?.data);
  const [payload, setPayload] = useState(request?.currentPayload || defaultExamplePayload);
  const isPayloadModified = payload !== defaultExamplePayload;
  const [selectedExample, setSelectedExample] = useState<string>(request?.selectedExample || request?.examples?.[0]?.name || 'custom');
  const [statusCode, setStatusCode] = useState<number>(request?.statusCode ?? 200);
  const [latencyMs, setLatencyMs] = useState<number>(request?.latencyMs ?? 0);
  const [pathParamsOverrides, setPathParamsOverrides] = useState<Record<string, string>>(request?.pathParamsOverrides || {});
  const [isSaving, setIsSaving] = useState(false);
  const { theme } = useTheme();

  // Sync state when request changes
  useEffect(() => {
    if (request) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayload(request.currentPayload || getPayloadString(request.examples?.[0]?.response?.body?.data));
      setSelectedExample(request.selectedExample || request.examples?.[0]?.name || 'custom');
      setStatusCode(request.statusCode ?? 200);
      setLatencyMs(request.latencyMs ?? 0);
      setPathParamsOverrides(request.pathParamsOverrides || {});
    }
  }, [request]);

  const urlParams = useMemo(() => {
    if (!request?.url) return { variables: [], pathParams: [] };
    
    const vars = Array.from(request.url.matchAll(/\{\{([^}]+)\}\}/g)).map(m => m[1] as string);
    const paths = Array.from(request.url.matchAll(/:([a-zA-Z0-9_]+)/g)).map(m => m[1] as string);
    
    return {
      variables: [...new Set(vars)],
      pathParams: [...new Set(paths)]
    };
  }, [request]);

  if (!request) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center text-muted-foreground space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/50">
          <span className="text-2xl opacity-50">🔍</span>
        </div>
        <p className="font-medium">Sélectionnez une requête pour voir les détails</p>
      </div>
    );
  }

  const handleToggleMock = async () => {
    setIsSaving(true);
    try {
      await updateMock(request.id, { isMocked: !request.isMocked, payload, statusCode, latencyMs, pathParamsOverrides });
      loadCollection();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayload = async () => {
    setIsSaving(true);
    try {
      await updateMock(request.id, { payload, selectedExample, statusCode, latencyMs, pathParamsOverrides });
      loadCollection();
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
      await updateMock(request.id, { statusCode: newCode });
      loadCollection();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLatencyChange = async (newLatency: number) => {
    setIsSaving(true);
    try {
      await updateMock(request.id, { latencyMs: newLatency });
      loadCollection();
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
      await updateMock(request.id, { pathParamsOverrides: newOverrides });
      loadCollection();
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
      await updateMock(request.id, { payload: newPayload, selectedExample: ex.name });
      loadCollection();
    } catch (e: unknown) {
      console.error(e);
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
    await updateMock(request.id, { isStarred: !request.isStarred });
    loadCollection();
    setIsSaving(false);
  };

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden font-sans">
      
      <div className="p-4 bg-card border-b neo:border-b-2 border-border neo:border-neo-border z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full">
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <button 
              onClick={handleToggleStar}
              disabled={isSaving}
              className={`text-2xl hover:scale-110 transition-transform ${request.isStarred ? 'text-neo-yellow-dark' : 'text-slate-400'}`}
              title={request.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {request.isStarred ? '⭐' : '☆'}
            </button>
            <span className="truncate">{request.name}</span>
            {request.isMocked && (
              <span className="neo-badge neo:bg-neo-green neo:text-black">
                MOCK ACTIF
              </span>
            )}
          </h2>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2">
              <span className={`neo-badge bg-white dark:bg-slate-900 ${
                 request.method === 'GET' ? 'text-green-600' : 
                 request.method === 'POST' ? 'text-blue-600' : 
                 request.method === 'DELETE' ? 'text-red-600' : 'text-orange-600'
               }`}>
                {request.method}
              </span>
              <p className="text-sm text-foreground font-bold truncate max-w-full">{request.url}</p>
            </div>
            
            {/* Variables & Path Params UI */}
            {(urlParams.variables.length > 0 || urlParams.pathParams.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-1 items-center">
                <span className="text-xs font-black uppercase mr-1">URL Params:</span>
                {[...urlParams.variables, ...urlParams.pathParams].map(param => (
                  <div key={param} className="flex items-center neo-input p-0 overflow-hidden h-8">
                    <span className="text-xs font-bold px-2 py-1 bg-muted border-r neo:border-r-2 border-border neo:border-neo-border h-full flex items-center">
                      {urlParams.variables.includes(param) ? `{{${param}}}` : `:${param}`}
                    </span>
                    <input 
                      type="text" 
                      placeholder="Default"
                      value={pathParamsOverrides[param] || ''}
                      onChange={(e) => setPathParamsOverrides({ ...pathParamsOverrides, [param]: e.target.value })}
                      onBlur={(e) => handleParamChange(param, e.target.value)}
                      className="bg-transparent text-xs font-bold px-2 py-1 w-24 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={handleToggleMock} 
            disabled={isSaving}
            className={`neo-button px-4 py-2 ${request.isMocked ? 'neo:bg-neo-green neo:text-black bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
            {request.isMocked ? 'Mock Actif' : 'Pass-through'}
          </button>
          <button 
            onClick={handleSavePayload} 
            disabled={isSaving}
            className="neo-button px-4 py-2 neo:bg-neo-pink bg-primary text-primary-foreground neo:text-black">
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 z-10 bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 p-4 neo-box">
          
          <div className="flex flex-col xl:flex-row xl:items-center gap-6 mb-6 bg-muted p-4 border neo:border-2 border-border neo:border-neo-border rounded-xl">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-black uppercase">Statut :</span>
              <Select value={statusCode.toString()} onValueChange={(v) => handleStatusChange(parseInt(v))}>
                <SelectTrigger className="w-[160px] h-10 neo-input font-bold bg-white text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="neo-select-content bg-card">
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
            
            <div className="h-px xl:h-10 xl:w-px bg-border neo:bg-neo-border w-full xl:w-px"></div>
            
            <div className="flex flex-col flex-1 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase">Latence :</span>
                <span className="text-sm font-bold neo-badge bg-card text-foreground">
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
                className="w-full accent-neo-blue h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer border-2 border-neo-border"
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
                <SelectTrigger className="w-full h-10 neo-input font-bold bg-white text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-2 border-neo-border shadow-[4px_4px_0px_black] font-bold">
                  {request.examples.map(ex => (
                    <SelectItem key={ex.name} value={ex.name}>{ex.name}</SelectItem>
                  ))}
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="neo-input bg-slate-100 text-slate-500 font-bold">Aucun exemple disponible</div>
            )}
          </div>
          
          <h3 className="text-sm font-black uppercase mb-2 mt-4">Payload de Réponse (JSON) :</h3>
          
          {/* L'éditeur avec l'effet Néo-brutaliste si modifié */}
          <div className={`flex-1 flex flex-col rounded-xl overflow-hidden relative ${isPayloadModified ? 'neo-modified-glow' : 'border-[3px] border-neo-border'}`}>
            {isPayloadModified && (
               <div className="absolute top-2 right-6 z-20 text-neo-yellow-dark font-black text-sm pointer-events-none drop-shadow-md">
                 Payload Modifié (Surcharge Locale)
               </div>
            )}
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={theme === 'light' ? 'light' : 'vs-dark'}
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
              className="neo-button bg-neo-red text-black w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2"
              onClick={() => {
                setPayload(defaultExamplePayload);
                setSelectedExample(request.examples?.[0]?.name || 'custom');
              }}
            >
              <span>↺</span> Recharger l'original (Bruno Reset)
            </button>
            
            <div className="flex items-center gap-2 font-black uppercase text-sm">
              ÉTAT ACTUEL : 
              <span className={`neo-badge text-black text-sm px-3 py-1 ${isPayloadModified ? 'bg-neo-yellow' : 'bg-slate-200'}`}>
                {isPayloadModified ? 'Surchargé Localement' : 'Original Bruno'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
