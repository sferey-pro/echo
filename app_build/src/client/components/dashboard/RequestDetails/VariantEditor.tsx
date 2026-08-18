import { Editor } from "@monaco-editor/react";
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

interface VariantEditorProps {
  request: ApiRequest;
  activeVariant: MockVariantDef;
  isSaving: boolean;
  onToggleMock: () => void;
  onSavePayload: () => void;
  statusCode: number;
  onStatusChange: (status: number) => void;
  latencyMs: number;
  onLatencyChange: (latency: number) => void;
  selectedExample: string;
  onExampleChange: (exampleName: string) => void;
  payload: string;
  onPayloadChange: (payload: string | undefined) => void;
  defaultExamplePayload: string;
  onResetPayload: () => void;
}

export function VariantEditor({
  request,
  activeVariant,
  isSaving,
  onToggleMock,
  onSavePayload,
  statusCode,
  onStatusChange,
  latencyMs,
  onLatencyChange,
  selectedExample,
  onExampleChange,
  payload,
  onPayloadChange,
  defaultExamplePayload,
  onResetPayload,
}: VariantEditorProps) {
  const isPayloadModified = payload !== defaultExamplePayload;

  return (
    <>
      <div className="px-4 py-3 bg-slate-50 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Button
            onClick={onToggleMock}
            disabled={isSaving}
            variant={activeVariant.isMocked ? "default" : "outline"}
            className={
              activeVariant.isMocked
                ? "bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                : "font-bold border-2"
            }
          >
            {activeVariant.isMocked
              ? "Mock Actif pour cette Variante"
              : "Activer le Mock (Pass-through)"}
          </Button>
          <Button
            onClick={onSavePayload}
            disabled={isSaving}
            variant="default"
            className="font-bold shadow-md"
          >
            {isSaving ? "Sauvegarde..." : "Sauvegarder les modifications"}
          </Button>
        </div>
        <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
          Status global :
          <span
            className={`px-3 py-1 rounded-full text-white shadow-sm ${activeVariant.isMocked ? "bg-emerald-500" : "bg-slate-400"}`}
          >
            {activeVariant.isMocked ? "MOCK" : "PROXY"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 z-10 bg-slate-50 ">
        <div className="flex flex-col h-full bg-white p-4 border border-border shadow-sm rounded-xl">
          <div className="flex flex-col xl:flex-row xl:items-center gap-6 mb-6 bg-muted p-4 border border-border rounded-xl">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-black uppercase">Statut :</span>
              <Select
                value={statusCode.toString()}
                onValueChange={(v) => onStatusChange(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[160px] h-10 font-bold bg-white text-black">
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
                onChange={(e) => onLatencyChange(parseInt(e.target.value, 10))}
                onMouseUp={() => onLatencyChange(latencyMs)}
                onTouchEnd={() => onLatencyChange(latencyMs)}
                onKeyUp={(e) => {
                  if (
                    [
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                    ].includes(e.key)
                  )
                    onLatencyChange(latencyMs);
                }}
                className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer border-2 border-slate-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <h3 className="text-sm font-black uppercase">
              Exemple MSW à Activer :
            </h3>
            {request.examples && request.examples.length > 0 ? (
              <Select value={selectedExample} onValueChange={onExampleChange}>
                <SelectTrigger className="w-full h-10 font-bold bg-white text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-border font-bold">
                  {request.examples.map((ex) => (
                    <SelectItem key={ex.name} value={ex.name}>
                      {ex.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="bg-slate-100 text-slate-500 font-bold">
                Aucun exemple disponible
              </div>
            )}
          </div>

          <h3 className="text-sm font-black uppercase mb-2 mt-4">
            Payload de Réponse (JSON) :
          </h3>

          <div
            className={`flex-1 flex flex-col rounded-xl overflow-hidden relative shadow-inner bg-[#1e1e1e] border-4 ${isPayloadModified ? "border-primary/20" : "border-[#2d2d2d]"}`}
          >
            {isPayloadModified && (
              <div className="absolute top-2 right-6 z-20 font-black text-sm text-primary pointer-events-none drop-shadow-md">
                Payload Modifié (Surcharge Locale)
              </div>
            )}
            <Editor
              height="100%"
              defaultLanguage="json"
              theme="vs-dark"
              value={payload}
              onChange={onPayloadChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                wordWrap: "on",
                formatOnPaste: true,
                padding: { top: 32, bottom: 8 },
                lineNumbersMinChars: 3,
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button
              variant="secondary"
              className="w-full sm:w-auto px-6 py-6 font-bold flex items-center justify-center gap-2 transition-colors"
              onClick={onResetPayload}
            >
              <span>↺</span> Recharger l'original (Bruno Reset)
            </Button>

            <div className="flex items-center gap-2 font-black uppercase text-sm">
              ÉTAT ACTUEL :
              <span
                className={`text-sm px-3 py-1 rounded-md font-bold ${isPayloadModified ? "bg-primary text-primary-foreground" : "bg-slate-200 text-slate-600"}`}
              >
                {isPayloadModified ? "Surchargé Localement" : "Original Bruno"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
