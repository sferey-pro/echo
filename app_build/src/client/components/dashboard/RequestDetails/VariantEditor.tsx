import { useState } from "react";
import type { MockVariantDef } from "@/shared/schemas";
import type { ApiRequest } from "../../../../shared/lib/parser";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { JsonEditor } from "../../ui/json-editor";

interface VariantEditorProps {
  request: ApiRequest;
  activeVariant: MockVariantDef;
  hasUnsavedChanges: boolean;
  isTogglingMock: boolean;
  isSavingPayload: boolean;
  onToggleMock: () => void;
  onSavePayload: () => void;
  statusCode: number;
  onStatusChange: (status: number) => void;
  latencyMs: number;
  onLatencyChange: (latency: number) => void;
  onLatencySave: (latency: number) => void;
  selectedExample: string;
  onExampleChange: (exampleName: string) => void;
  payload: string;
  onPayloadChange: (payload: string | undefined) => void;
  defaultExamplePayload: string;
}

export function VariantEditor({
  request,
  activeVariant,
  hasUnsavedChanges,
  isTogglingMock,
  isSavingPayload,
  onToggleMock,
  onSavePayload,
  statusCode,
  onStatusChange,
  latencyMs,
  onLatencyChange,
  onLatencySave,
  selectedExample,
  onExampleChange,
  payload,
  onPayloadChange,
  defaultExamplePayload,
}: VariantEditorProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPayloadModified = payload !== defaultExamplePayload;

  return (
    <>
      <div className="px-4 py-3 bg-slate-50 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm z-20">
        <div className="flex items-center gap-6">
          <Button
            onClick={onToggleMock}
            isLoading={isTogglingMock}
            variant={activeVariant.isMocked ? "default" : "outline"}
            className={
              `w-[280px] shrink-0 ` +
              (activeVariant.isMocked
                ? "bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                : "font-bold border-2")
            }
          >
            {activeVariant.isMocked
              ? "Mock Actif pour cette Variante"
              : "Activer le Mock (Pass-through)"}
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase text-slate-500 shrink-0">
              Latence :
            </span>
            <input
              type="range"
              min="0"
              max="5000"
              step="50"
              value={latencyMs}
              onChange={(e) => onLatencyChange(parseInt(e.target.value, 10))}
              onMouseUp={() => onLatencySave(latencyMs)}
              onTouchEnd={() => onLatencySave(latencyMs)}
              onKeyUp={(e) => {
                if (
                  [
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                  ].includes(e.key)
                )
                  onLatencySave(latencyMs);
              }}
              className="w-[100px] accent-primary h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer border border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700 w-12 shrink-0">
              {latencyMs} ms
            </span>
          </div>
        </div>

        <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 shrink-0">
          Status global :
          <span
            className={`px-3 py-1 rounded-full text-white shadow-sm ${activeVariant.isMocked ? "bg-emerald-500" : "bg-slate-400"}`}
          >
            {activeVariant.isMocked ? "MOCK" : "PROXY"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 z-10 bg-slate-50">

        <div className="flex flex-col h-full bg-white p-4 border border-border shadow-sm rounded-xl">
          <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 mb-4">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256"><path fill="currentColor" d="M224 128a8 8 0 0 1-8 8h-36.69l-22.65 67.94a8 8 0 0 1-15.19-1.34L110 93.3l-14.7 48.51a8 8 0 0 1-7.66 5.69H32a8 8 0 0 1 0-16h49.31l22.65-74.74a8 8 0 0 1 15.22 1.48l31.42 108l14.7-44.1a8 8 0 0 1 7.6-5.47H216a8 8 0 0 1 8 8Z"></path></svg>
            Définition de la Réponse HTTP
          </h3>
          
          <div className="flex flex-col gap-2 mb-6">
            <span className="text-sm font-black text-slate-600 uppercase">Charger un preset (Exemples Bruno) :</span>
            {request.examples && request.examples.length > 0 ? (
              <Select value={selectedExample} onValueChange={onExampleChange}>
                <SelectTrigger className="w-full h-11 font-bold bg-white border-2 border-slate-200 text-black focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-2 border-slate-200 font-bold">
                  {request.examples.map((ex) => (
                    <SelectItem key={ex.name} value={ex.name}>
                      {ex.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="bg-slate-100 text-slate-500 font-bold p-3 rounded-md border border-slate-200">
                Aucun exemple disponible
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl">
            <span className="text-sm font-black uppercase text-slate-600">Statut HTTP :</span>
            <Select
              value={statusCode.toString()}
              onValueChange={(v) => onStatusChange(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[160px] h-10 font-bold bg-white text-black border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
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

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black uppercase">
              Payload de Réponse (JSON) :
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-2 bg-white text-xs font-bold"
            >
              {copied ? (
                <>
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256"><path fill="currentColor" d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0ZM224 128a96 96 0 1 1-96-96a96.11 96.11 0 0 1 96 96Zm-16 0a80 80 0 1 0-80 80a80.09 80.09 0 0 0 80-80Z"></path></svg>
                  Copié !
                </>
              ) : (
                <>
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256"><path fill="currentColor" d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8Zm-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z"></path></svg>
                  Copier le JSON
                </>
              )}
            </Button>
          </div>

          <div
            className={`flex-1 flex flex-col rounded-xl overflow-hidden relative shadow-inner bg-[#1e1e1e] border-4 ${isPayloadModified ? "border-primary/20" : "border-[#2d2d2d]"}`}
          >
            {isPayloadModified && (
              <div className="absolute top-3 left-3 z-20 font-black text-xs text-primary pointer-events-none drop-shadow-md bg-black/50 px-2 py-1 rounded-md">
                Surcharge Locale
              </div>
            )}
            <div
              data-testid="monaco-editor-mock"
              className="w-full h-full flex-1 min-h-[300px]"
            >
              <JsonEditor
                value={payload}
                onChange={onPayloadChange}
                className="pt-2 !bg-transparent border-none ring-0"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <Button
              onClick={onSavePayload}
              isLoading={isSavingPayload}
              variant={hasUnsavedChanges ? "destructive" : "default"}
              className={`font-bold shadow-md transition-all px-6 py-6 w-full sm:w-auto ${hasUnsavedChanges ? "animate-pulse" : ""}`}
            >
              {hasUnsavedChanges ? "Sauvegarder (Modifications en attente)" : "Sauvegarder les modifications"}
            </Button>

            <div className="flex items-center gap-2 font-black uppercase text-sm">
              ÉTAT ACTUEL :
              <span
                className={`text-sm px-3 py-1 rounded-md font-bold ${hasUnsavedChanges ? "bg-amber-500 text-white" : isPayloadModified ? "bg-primary text-primary-foreground" : "bg-slate-200 text-slate-600"}`}
              >
                {hasUnsavedChanges ? "BROUILLON NON SAUVEGARDÉ" : isPayloadModified ? "Surchargé Localement" : "Original Bruno"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
