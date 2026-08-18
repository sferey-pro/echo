import { Button } from "@/client/components/ui/button";
import { MethodBadge } from "@/client/components/ui/method-badge";
import type { ApiRequest } from "../../../shared/lib/parser";
import type { ScenarioAction } from "../../lib/api";

interface ScenarioRequestListProps {
  actions: ScenarioAction[];
  requests: ApiRequest[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onAddClick: () => void;
}

export function ScenarioRequestList({
  actions,
  requests,
  selectedIndex,
  onSelect,
  onRemove,
  onAddClick,
}: ScenarioRequestListProps) {
  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-80 shrink-0">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">
          Requêtes du Scénario
        </h3>
        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">
          {actions.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {actions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full space-y-3">
            <span className="text-3xl opacity-50">👻</span>
            <p className="text-xs">Aucune requête configurée.</p>
          </div>
        ) : (
          actions.map((action, index) => {
            const req = requests.find((r) => r.id === action.requestId);
            const isSelected = selectedIndex === index;

            return (
              <div
                key={`${action.requestId}-${index}`}
                onClick={() => onSelect(index)}
                className={`group cursor-pointer flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "bg-background border-border hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex flex-col gap-1.5 overflow-hidden w-full">
                  <span
                    className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}
                  >
                    {req?.name || "Inconnue"}
                  </span>
                  <div className="flex items-center gap-2">
                    <MethodBadge method={req?.method || "GET"} />
                    <span className="text-[10px] text-muted-foreground font-mono truncate">
                      {req?.url || ""}
                    </span>
                  </div>
                  {action.statusCode && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${action.statusCode >= 200 && action.statusCode < 300 ? "bg-green-500" : action.statusCode >= 400 ? "bg-orange-500" : action.statusCode >= 500 ? "bg-red-500" : "bg-blue-500"}`}
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {action.statusCode} • {action.latencyMs}ms
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  className={`h-6 w-6 p-0 shrink-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${isSelected ? "opacity-100" : ""}`}
                >
                  ×
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/10">
        <Button
          onClick={onAddClick}
          className="w-full shadow-sm hover:shadow-md transition-shadow"
          size="sm"
        >
          + Ajouter une requête
        </Button>
      </div>
    </div>
  );
}
