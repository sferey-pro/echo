
import { MethodBadge } from "@/client/components/ui/method-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import type { ApiRequest } from "../../../shared/lib/parser";
import type { ScenarioAction } from "../../lib/api";
import { useState, useEffect } from "react";
import { JsonEditor } from "@/client/components/ui/json-editor";

interface ScenarioRequestDetailProps {
  action: ScenarioAction;
  request?: ApiRequest;
  onUpdate: (updates: Partial<ScenarioAction>) => void;
}

export function ScenarioRequestDetail({
  action,
  request,
  onUpdate,
}: ScenarioRequestDetailProps) {
  const [localPayload, setLocalPayload] = useState<string>(() => {
    return typeof action.payload === "string"
      ? action.payload
      : JSON.stringify(action.payload || {}, null, 2);
  });

  useEffect(() => {
    const extStr = typeof action.payload === "string" 
      ? action.payload 
      : JSON.stringify(action.payload || {}, null, 2);
    setLocalPayload(extStr);
  }, [action.payload]);

  if (!request) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground p-8 text-center h-full">
        Sélectionnez une requête pour l'éditer.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {request.name}
        </h2>
        <div className="flex items-center gap-3">
          <MethodBadge method={request.method} />
          <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {request.url}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Paramètres de Réponse */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Paramètres de réponse
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statut */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Statut HTTP
              </label>
              <Select
                value={action.statusCode.toString()}
                onValueChange={(v) => onUpdate({ statusCode: parseInt(v, 10) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

            {/* Latence */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                <span>Latence</span>
                <span className="text-primary font-mono">
                  {action.latencyMs}ms
                </span>
              </label>
              <div className="pt-2">
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={action.latencyMs}
                  onChange={(e) =>
                    onUpdate({ latencyMs: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Variantes et Exemples (si dispo) */}
        {((request.variants?.length ?? 0) > 0 ||
          (request.examples?.length ?? 0) > 0) && (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Préconfigurations
            </h3>

            {(request.variants?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Variantes
                </label>
                <div className="flex flex-wrap gap-2">
                  {request.variants?.map((variant: any) => (
                    <button
                      type="button"
                      key={variant.id}
                      onClick={() =>
                        onUpdate({
                          statusCode: variant.statusCode,
                          latencyMs: variant.latencyMs,
                          selectedExample: variant.selectedExample,
                          payload: variant.payload,
                        })
                      }
                      className="text-xs px-3 py-1.5 rounded-md font-medium transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent"
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(request.examples?.length ?? 0) > 0 && (
              <div className="space-y-2 mt-4">
                <label className="text-xs font-semibold text-muted-foreground">
                  Exemples de Payload
                </label>
                <div className="flex flex-wrap gap-2">
                  {request.examples?.map((ex: any) => (
                    <button
                      type="button"
                      key={ex.name}
                      onClick={() =>
                        onUpdate({
                          selectedExample: ex.name,
                          payload:
                            typeof ex.response?.body?.data === "string"
                              ? ex.response?.body?.data
                              : JSON.stringify(
                                  ex.response?.body?.data || {},
                                  null,
                                  2,
                                ),
                        })
                      }
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                        action.selectedExample === ex.name
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {ex.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        selectedExample: "custom",
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                      action.selectedExample === "custom"
                        ? "bg-background border-primary text-foreground shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-foreground/30"
                    } border`}
                  >
                    Personnalisé
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Payload */}
        <section className="space-y-4 flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Payload (JSON)
              </h3>
              {action.selectedExample && action.selectedExample !== "custom" && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Exemple actif : {action.selectedExample}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {localPayload !== (typeof action.payload === "string" ? action.payload : JSON.stringify(action.payload || {}, null, 2)) && (
                <>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                    Modification non sauvegardée
                  </span>
                  <button
                    onClick={() => {
                      onUpdate({
                        payload: localPayload,
                        selectedExample: "custom",
                      });
                    }}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-bold hover:bg-primary/90 transition-colors"
                  >
                    Sauvegarder
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className={`flex-1 border rounded-xl overflow-hidden shadow-sm h-full transition-colors ${
            localPayload !== (typeof action.payload === "string" ? action.payload : JSON.stringify(action.payload || {}, null, 2))
              ? "border-amber-500/50 ring-1 ring-amber-500/20"
              : "border-border"
          }`}>
            <div data-testid="monaco-mock" className="w-full h-full">
              <JsonEditor
                value={localPayload}
                onChange={(newVal) => {
                  setLocalPayload(newVal);
                }}
                className="!bg-transparent border-none ring-0"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
