import { ArrowLeft, CheckCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { MethodBadge } from "@/client/components/ui/method-badge";
import type { ApiRequest } from "../../../shared/lib/parser";
import type { Scenario, ScenarioAction } from "../../lib/api";
import { fetchScenarios, updateScenario } from "../../lib/api";
import { ScenarioRequestDetail } from "./ScenarioRequestDetail";
import { ScenarioRequestList } from "./ScenarioRequestList";

interface ScenarioEditorProps {
  scenarioId: string;
  requests: ApiRequest[];
  onUpdate?: () => void;
  onClose: () => void;
}

export function ScenarioEditor({
  scenarioId,
  requests,
  onUpdate,
  onClose,
}: ScenarioEditorProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState<string | undefined>("");
  const [icon, setIcon] = useState<string | undefined>("");
  const [actions, setActions] = useState<ScenarioAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const scens = await fetchScenarios();
        const sc = scens.find((s) => s.id === scenarioId);
        if (sc) {
          setScenario(sc);
          setName(sc.name);
          setDescription(sc.description);
          setIcon(sc.icon);
          setActions(sc.actions);
          if (sc.actions.length > 0) {
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    load();
  }, [scenarioId]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateScenario(scenarioId, name, description, icon, actions);
      onUpdate?.();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  const addAction = (req: ApiRequest) => {
    if (actions.find((a) => a.requestId === req.id)) return;
    const newAction = {
      requestId: req.id,
      isMocked: true,
      statusCode: 200,
      latencyMs: 0,
      payload:
        typeof req.examples?.[0]?.response?.body?.data === "string"
          ? req.examples?.[0]?.response?.body?.data
          : JSON.stringify(
              req.examples?.[0]?.response?.body?.data || {},
              null,
              2,
            ),
      selectedExample: req.examples?.[0]?.name || null,
      pathParamsOverrides: {},
    };
    const newActions = [...actions, newAction];
    setActions(newActions);
    setSelectedIndex(newActions.length - 1);
    setSearchQuery("");
    setIsAdding(false);
  };

  const updateAction = (index: number, updates: Partial<ScenarioAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates } as ScenarioAction;
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    const newActions = [...actions];
    newActions.splice(index, 1);
    setActions(newActions);
    if (selectedIndex === index) {
      setSelectedIndex(newActions.length > 0 ? 0 : null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const filteredRequests = requests
    .filter(
      (r) =>
        !actions.find((a) => a.requestId === r.id) &&
        (r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.url.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .slice(0, 20);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Chargement du scénario...</p>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Scénario introuvable</p>
        <Button onClick={onClose} variant="outline">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Édition du scénario
            </span>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm font-bold text-foreground h-6 px-1 py-0 border-transparent hover:border-border focus-visible:ring-0 focus-visible:border-primary bg-transparent w-[300px] shadow-none -ml-1 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-8 gap-2 px-4 shadow-sm"
          >
            {isSaving ? (
              "Sauvegarde..."
            ) : saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" weight="bold" /> Sauvegardé
              </>
            ) : (
              "Sauvegarder"
            )}
          </Button>
        </div>
      </div>

      {/* Main Content: Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        <ScenarioRequestList
          actions={actions}
          requests={requests}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onRemove={removeAction}
          onAddClick={() => setIsAdding(true)}
        />

        {selectedIndex !== null && actions[selectedIndex] ? (
          <ScenarioRequestDetail
            action={actions[selectedIndex]!}
            request={requests.find(
              (r) => r.id === actions[selectedIndex!]?.requestId,
            )}
            onUpdate={(updates) => updateAction(selectedIndex!, updates)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10 text-muted-foreground flex-col gap-4">
            <span className="text-4xl opacity-20">👈</span>
            <p>Sélectionnez ou ajoutez une requête pour commencer l'édition.</p>
          </div>
        )}
      </div>

      {/* Add Request Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-xl p-0 gap-0 rounded-xl overflow-hidden shadow-2xl border-border">
          <DialogHeader className="p-4 border-b border-border bg-card">
            <DialogTitle>Ajouter une requête au scénario</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-muted/30">
            <Input
              autoFocus
              type="text"
              placeholder="Rechercher une requête (nom, url)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background shadow-sm border-border h-10"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2 flex flex-col gap-1">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <button
                  type="button"
                  key={req.id}
                  onClick={() => addAction(req)}
                  className="flex flex-col items-start p-3 hover:bg-primary/10 rounded-lg transition-colors text-left border border-transparent hover:border-primary/20"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {req.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <MethodBadge method={req.method} />
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {req.url}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Aucune requête correspondante.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
