import { MaskHappy } from "@phosphor-icons/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
} from "@/client/components/ui/alert-dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import type { Scenario } from "../../lib/api";
import {
  applyScenario,
  createScenario,
  deleteScenario,
  fetchScenarios,
} from "../../lib/api";
import { useStore } from "../../store/useStore";

export function ScenarioPanel() {
  const { selectedScenarioId, setSelectedScenarioId, loadCollection } =
    useStore();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadScenarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchScenarios();
      setScenarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;
    setIsSaving(true);
    try {
      await createScenario(newScenarioName.trim(), []);
      setNewScenarioName("");
      setIsCreating(false);
      await loadScenarios();
      toast.success("Scénario créé avec succès");
    } catch (err) {
      console.error(err);
      toast.error(
        `Erreur lors de la création du scénario: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    setIsSaving(false);
  };

  const handleApply = async (id: string) => {
    try {
      await applyScenario(id);
      loadCollection();
      toast.success("Scénario appliqué avec succès");
    } catch (err) {
      console.error(err);
      toast.error(
        `Erreur lors de l'application du scénario: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScenario(id);
      await loadScenarios();
      toast.success("Scénario supprimé avec succès");
    } catch (err) {
      console.error(err);
      toast.error(
        `Erreur lors de la suppression du scénario: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-3 border-b border-border bg-card shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Mes Scénarios</h3>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          variant={isCreating ? "secondary" : "default"}
          size="sm"
          className="text-xs h-7 px-2"
        >
          {isCreating ? "Annuler" : "+ Nouveau"}
        </Button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleSaveCurrent}
          className="p-3 border-b border-border bg-muted flex flex-col gap-2"
        >
          <p className="text-xs text-muted-foreground">
            Créer un nouveau scénario vide.
          </p>
          <div className="flex gap-2">
            <Input
              autoFocus
              type="text"
              placeholder="Nom du scénario (ex: Parcours 500)"
              value={newScenarioName}
              onChange={(e) => setNewScenarioName(e.target.value)}
            />
            <Button
              type="submit"
              disabled={isSaving || !newScenarioName.trim()}
              size="sm"
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSaving ? "..." : "Save"}
            </Button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center p-4">
            Chargement...
          </p>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
            <MaskHappy
              className="w-10 h-10 mb-2 text-muted-foreground opacity-80"
              weight="duotone"
            />
            <p className="text-xs">Aucun scénario sauvegardé.</p>
          </div>
        ) : (
          scenarios.map((scenario) => (
            // biome-ignore lint/a11y/useSemanticElements: Tailwind styling constraints require div with role button
            <div
              key={scenario.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setSelectedScenarioId(scenario.id);
              }}
              className={`group flex flex-col hover:bg-accent border rounded-lg p-3 transition-colors cursor-pointer ${selectedScenarioId === scenario.id ? "bg-accent border-primary/50" : "bg-card border-border"}`}
              onClick={() => setSelectedScenarioId(scenario.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-foreground flex items-center gap-2">
                  <MaskHappy
                    className="w-4 h-4 mr-1.5 text-primary"
                    weight="fill"
                  />{" "}
                  {scenario.name}
                </span>
              </div>

              <div className="flex gap-2 mt-1">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(scenario.id);
                  }}
                  className="flex-1 h-7 text-xs"
                  size="sm"
                >
                  ▶ Appliquer
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Supprimer"
                    >
                      ×
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="shadow-lg rounded-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-bold text-xl text-red-600">
                        Supprimer ce scénario ?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        Cette action supprimera définitivement le scénario "
                        {scenario.name}". Cela n'affectera pas les requêtes de
                        votre collection.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(scenario.id);
                        }}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
