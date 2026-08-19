import type React from "react";
import { useEffect, useState } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { getSettings, updateSetting } from "../../lib/api";

interface CollectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CollectionSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: CollectionSettingsModalProps) {
  const [gitSyncInterval, setGitSyncInterval] = useState("");
  const [loading, setLoading] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getSettings()
        .then((settings) => {
          setGitSyncInterval(settings.GIT_SYNC_INTERVAL || "300000");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Removed manual ESC handler as Dialog handles it natively

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (gitSyncInterval !== undefined)
        await updateSetting("GIT_SYNC_INTERVAL", gitSyncInterval);
      onSaved();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        `Erreur lors de la sauvegarde: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync/cleanup", { method: "DELETE" });
      if (res.ok) {
        toast.success("Données obsolètes nettoyées !");
        onSaved(); // Reload collection
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(
          `Erreur lors du nettoyage: ${err.error || err.message || "Inconnue"}`,
        );
      }
    } catch (e) {
      toast.error(
        `Erreur réseau lors du nettoyage: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Paramètres de la Collection
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="collection-name"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Intervalle de Synchronisation Git (ms)
                </label>
                <Input
                  type="number"
                  value={gitSyncInterval}
                  onChange={(e) => setGitSyncInterval(e.target.value)}
                  placeholder="Ex: 300000"
                  className="focus-visible:ring-primary"
                />
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  Fréquence du `git fetch` automatique (par défaut: 300000ms = 5
                  minutes).
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h3 className="text-sm font-semibold text-red-600 mb-2">
                Zone Dangereuse
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Supprime définitivement de la base de données toutes les
                requêtes et dossiers marqués comme <strong>Obsolètes</strong>{" "}
                (fichiers supprimés ou renommés dans Git), ainsi que leurs
                configurations (mocks, favoris, payloads modifiés).
              </p>
              <AlertDialog>
                <div className="flex justify-end mt-4">
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      disabled={loading}
                      variant="destructive"
                      className="px-3 py-1.5 text-xs font-semibold"
                    >
                      Nettoyer les données obsolètes
                    </Button>
                  </AlertDialogTrigger>
                </div>
                <AlertDialogContent className="shadow-lg rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold text-xl text-red-600">
                      Confirmer le nettoyage
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Voulez-vous vraiment supprimer définitivement toutes les
                      requêtes, dossiers et environnements obsolètes (qui
                      n'existent plus dans Git) ainsi que leurs configurations ?
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCleanup}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Oui, nettoyer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" isLoading={loading}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
