import { MaskHappy, Play, Trash } from "@phosphor-icons/react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
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
  const [newScenarioIcon, setNewScenarioIcon] = useState("");
  const [newScenarioDescription, setNewScenarioDescription] = useState("");
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
      await createScenario(
        newScenarioName.trim(),
        newScenarioDescription.trim() || undefined,
        newScenarioIcon.trim() || undefined,
        [],
      );
      setNewScenarioName("");
      setNewScenarioIcon("");
      setNewScenarioDescription("");
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

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Scénario</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSaveCurrent}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Nom
              </label>
              <Input
                autoFocus
                type="text"
                placeholder="Ex: Parcours 500"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Icône (emoji)
              </label>
              <Input
                type="text"
                placeholder="Ex: 👻"
                value={newScenarioIcon}
                onChange={(e) => setNewScenarioIcon(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Description
              </label>
              <Input
                type="text"
                placeholder="Brève description..."
                value={newScenarioDescription}
                onChange={(e) => setNewScenarioDescription(e.target.value)}
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !newScenarioName.trim()}
              >
                {isSaving ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <div
              key={scenario.id}
              className={`group flex flex-col hover:bg-accent/50 border rounded-lg p-3 transition-colors w-full text-left bg-transparent ${
                selectedScenarioId === scenario.id
                  ? "bg-accent border-primary/50 shadow-sm"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className="flex-1 text-sm font-bold text-foreground flex flex-col gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    {scenario.icon ? (
                      <span className="text-lg leading-none">
                        {scenario.icon}
                      </span>
                    ) : (
                      <MaskHappy
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          selectedScenarioId === scenario.id
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-primary/70"
                        }`}
                        weight={
                          selectedScenarioId === scenario.id
                            ? "fill"
                            : "duotone"
                        }
                      />
                    )}
                    <span className="truncate">{scenario.name}</span>
                  </div>
                  {scenario.description && (
                    <span className="text-xs text-muted-foreground font-normal line-clamp-1">
                      {scenario.description}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                    {scenario.actions?.length || 0} requête
                    {scenario.actions?.length !== 1 ? "s" : ""}
                  </span>
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <Button
                  onClick={() => handleApply(scenario.id)}
                  className="flex-1 h-8 text-xs shadow-sm font-semibold"
                  size="sm"
                >
                  <Play weight="fill" className="w-3.5 h-3.5 mr-1.5" />{" "}
                  Appliquer
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      title="Supprimer"
                    >
                      <Trash className="w-4 h-4" weight="bold" />
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
