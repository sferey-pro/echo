import { Eye } from "@phosphor-icons/react";
import { useStore } from "../../../store/useStore";
import { RequestList } from "../../dashboard/RequestList";
import { ScenarioPanel } from "../../dashboard/ScenarioPanel";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface SidebarProps {
  onOpenEnvViewer: () => void;
  onOpenCollectionSettings: () => void;
  onOpenCollections: () => void;
}

export function Sidebar({
  onOpenEnvViewer,
  onOpenCollectionSettings,
  onOpenCollections,
}: SidebarProps) {
  const { environments, activeEnvironment, setActiveEnvironment } = useStore();

  const handleEnvChange = (val: string) => {
    setActiveEnvironment(val === "__none__" ? "" : val);
  };

  return (
    <div className="flex flex-col gap-6 min-h-[400px] md:h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm">
        <div className="bg-muted/50 p-3 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Collection Bruno
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-700 font-semibold text-[10px] uppercase">
              ENV
            </span>
            <Select
              value={activeEnvironment || "__none__"}
              onValueChange={handleEnvChange}
            >
              <SelectTrigger className="flex-1 h-7 text-xs bg-white text-black focus:ring-0">
                <SelectValue placeholder="Aucun env." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="__none__" className="text-xs">
                  Aucun env.
                </SelectItem>
                {environments.map((env) => (
                  <SelectItem
                    key={env.name}
                    value={env.name}
                    className="text-xs"
                  >
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="icon"
              onClick={onOpenEnvViewer}
              className="h-7 w-7 bg-green-50 text-green-700 hover:bg-green-100 shrink-0"
              title="Voir les variables d'environnement"
            >
              <Eye className="w-3.5 h-3.5" weight="bold" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <RequestList
            onOpenSettings={onOpenCollectionSettings}
            onOpenCollections={onOpenCollections}
          />
        </div>
      </div>

      <div className="h-1/3 flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm">
        <div className="bg-muted/50 p-3 border-b border-border">
          <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Scénarios Rapides
          </h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ScenarioPanel />
        </div>
      </div>
    </div>
  );
}
