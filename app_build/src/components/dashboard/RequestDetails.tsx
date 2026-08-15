import React, { useState, useMemo, useEffect } from 'react';
import type { ApiRequest } from '../../lib/parser';
import { Button } from '@/components/ui/button';
import Editor from '@monaco-editor/react';
import { updateMock } from '../../lib/api';

interface RequestDetailsProps {
  request: ApiRequest | null;
  onUpdate?: () => void;
}

export function RequestDetails({ request, onUpdate }: RequestDetailsProps) {
  const defaultExamplePayload = request?.examples?.[0]?.response?.body?.data || '';
  const [payload, setPayload] = useState(request?.currentPayload || defaultExamplePayload);
  const [selectedExample, setSelectedExample] = useState<string>(request?.selectedExample || request?.examples?.[0]?.name || 'custom');
  const [statusCode, setStatusCode] = useState<number>(request?.statusCode ?? 200);
  const [latencyMs, setLatencyMs] = useState<number>(request?.latencyMs ?? 0);
  const [pathParamsOverrides, setPathParamsOverrides] = useState<Record<string, string>>(request?.pathParamsOverrides || {});
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when request changes
  useEffect(() => {
    if (request) {
      setPayload(request.currentPayload || request.examples?.[0]?.response?.body?.data || '');
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
  }, [request?.url]);

  if (!request) {
    return (
      <div className="h-full bg-neutral-900 flex flex-col items-center justify-center text-neutral-500 space-y-4">
        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700/50">
          <span className="text-2xl opacity-50">🔍</span>
        </div>
        <p className="font-medium">Sélectionnez une requête pour voir les détails</p>
      </div>
    );
  }

  const handleToggleMock = async () => {
    setIsSaving(true);
    await updateMock(request.id, { isMocked: !request.isMocked, payload, statusCode, latencyMs, pathParamsOverrides });
    onUpdate?.();
    setIsSaving(false);
  };

  const handleSavePayload = async () => {
    setIsSaving(true);
    await updateMock(request.id, { payload, selectedExample, statusCode, latencyMs, pathParamsOverrides });
    onUpdate?.();
    setIsSaving(false);
  };

  const handleStatusChange = async (newCode: number) => {
    setStatusCode(newCode);
    setIsSaving(true);
    await updateMock(request.id, { statusCode: newCode });
    onUpdate?.();
    setIsSaving(false);
  };

  const handleLatencyChange = async (newLatency: number) => {
    setIsSaving(true);
    await updateMock(request.id, { latencyMs: newLatency });
    onUpdate?.();
    setIsSaving(false);
  };

  const handleParamChange = async (key: string, value: string) => {
    const newOverrides = { ...pathParamsOverrides, [key]: value };
    if (!value) delete newOverrides[key];
    setPathParamsOverrides(newOverrides);
    
    setIsSaving(true);
    await updateMock(request.id, { pathParamsOverrides: newOverrides });
    onUpdate?.();
    setIsSaving(false);
  };

  const handleExampleClick = async (ex: NonNullable<ApiRequest['examples']>[0]) => {
    setSelectedExample(ex.name);
    const newPayload = ex.response?.body?.data || '';
    setPayload(newPayload);
    setIsSaving(true);
    await updateMock(request.id, { payload: newPayload, selectedExample: ex.name });
    onUpdate?.();
    setIsSaving(false);
  };

  const handlePayloadChange = (value: string | undefined) => {
    setPayload(value || '');
    setSelectedExample('custom');
  };

  const handleToggleStar = async () => {
    setIsSaving(true);
    await updateMock(request.id, { isStarred: !request.isStarred });
    onUpdate?.();
    setIsSaving(false);
  };

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden">
      
      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-2xl z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0">
        <div className="w-full">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <button 
              onClick={handleToggleStar}
              disabled={isSaving}
              className={`text-xl hover:scale-110 transition-transform ${request.isStarred ? 'text-yellow-400' : 'text-neutral-600 hover:text-yellow-400/50'}`}
              title={request.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {request.isStarred ? '⭐' : '☆'}
            </button>
            {request.name}
            {request.isMocked && (
              <span className="text-[10px] uppercase font-bold bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
                Mocked
              </span>
            )}
          </h2>
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700">
                {request.method}
              </span>
              <p className="text-sm text-neutral-400 font-mono truncate max-w-full">{request.url}</p>
            </div>
            
            {/* Variables & Path Params UI */}
            {(urlParams.variables.length > 0 || urlParams.pathParams.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-1 items-center">
                <span className="text-[10px] uppercase font-semibold text-neutral-500 mr-1">URL Params:</span>
                {[...urlParams.variables, ...urlParams.pathParams].map(param => (
                  <div key={param} className="flex items-center bg-black/40 rounded border border-white/10 overflow-hidden group focus-within:border-purple-500/50 transition-colors">
                    <span className="text-[10px] font-mono text-purple-400/80 px-2 py-1 bg-white/5 border-r border-white/5">
                      {urlParams.variables.includes(param) ? `{{${param}}}` : `:${param}`}
                    </span>
                    <input 
                      type="text" 
                      placeholder="Default"
                      value={pathParamsOverrides[param] || ''}
                      onChange={(e) => setPathParamsOverrides({ ...pathParamsOverrides, [param]: e.target.value })}
                      onBlur={(e) => handleParamChange(param, e.target.value)}
                      className="bg-transparent text-[10px] font-mono text-white px-2 py-1 w-24 focus:outline-none placeholder:text-neutral-600"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button 
            onClick={handleToggleMock} 
            disabled={isSaving}
            variant={request.isMocked ? "default" : "outline"} 
            size="sm" 
            className={`h-9 font-medium transition-all active:scale-95 ${request.isMocked ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 border-green-400/50' : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'}`}>
            {request.isMocked ? 'Mock Actif' : 'Pass-through'}
          </Button>
          <Button 
            onClick={handleSavePayload} 
            disabled={isSaving}
            size="sm" 
            className="h-9 font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-95 border border-white/10">
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 z-10">
        <div className="flex flex-col h-full bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col xl:flex-row xl:items-center gap-6 mb-4 bg-black/20 p-4 rounded-lg border border-white/5 shadow-inner">
            
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold text-neutral-300">Statut HTTP :</span>
              <select 
                value={statusCode}
                onChange={(e) => handleStatusChange(parseInt(e.target.value))}
                className="bg-neutral-900 border border-white/10 rounded-md px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
              >
                <option value={200}>🟢 200 OK</option>
                <option value={201}>🟢 201 Created</option>
                <option value={204}>🟢 204 No Content</option>
                <option value={400}>🟠 400 Bad Request</option>
                <option value={401}>🟠 401 Unauthorized</option>
                <option value={403}>🟠 403 Forbidden</option>
                <option value={404}>🟠 404 Not Found</option>
                <option value={500}>🔴 500 Internal Error</option>
              </select>
            </div>
            
            <div className="h-px xl:h-8 xl:w-px bg-white/10 w-full xl:w-px"></div>
            
            <div className="flex flex-col flex-1 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-300">Latence simulée :</span>
                <span className="text-xs font-mono bg-neutral-900 px-2 py-0.5 rounded text-purple-400 border border-white/5">
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
                className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                title="Délai de réponse"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-medium px-1">
                <span>0ms</span>
                <span>2.5s</span>
                <span>5s</span>
              </div>
            </div>

          </div>
          
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-neutral-200">Payload de Réponse JSON</h3>
            <Button variant="ghost" size="sm" className="h-6 px-3 rounded-full bg-white/5 text-xs text-neutral-400 hover:text-white hover:bg-white/10 transition-all" onClick={() => {
              setPayload(defaultExamplePayload);
              setSelectedExample(request.examples?.[0]?.name || 'custom');
            }}>
              Reset (Bruno)
            </Button>
          </div>
          
          {/* Tabs d'accès rapide aux exemples */}
          {request.examples && request.examples.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3 bg-black/20 p-1.5 rounded-lg border border-white/5">
              <span className="text-xs font-medium text-neutral-500 pl-2">Exemples :</span>
              {request.examples.map(ex => (
                <button
                  key={ex.name}
                  onClick={() => handleExampleClick(ex)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${selectedExample === ex.name ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                >
                  {ex.name}
                </button>
              ))}
              <div className="h-4 w-px bg-white/10 mx-1"></div>
              <button
                onClick={() => setSelectedExample('custom')}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${selectedExample === 'custom' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-transparent text-neutral-500 hover:text-white border border-dashed border-neutral-600 hover:border-neutral-400'}`}
              >
                Personnalisé
              </button>
            </div>
          )}

          <div className="flex-1 bg-[#1e1e1e]/80 border border-white/5 shadow-inner rounded-lg overflow-hidden pt-2">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme="vs-dark"
              value={payload}
              onChange={handlePayloadChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                wordWrap: "on",
                formatOnPaste: true,
                padding: { top: 8, bottom: 8 },
                lineNumbersMinChars: 3,
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
