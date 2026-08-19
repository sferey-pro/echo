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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onSaved,
}: SettingsModalProps) {
  const [targetApiUrl, setTargetApiUrl] = useState("");
  const [loading, setLoading] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      getSettings()
        .then((settings) => {
          setTargetApiUrl(settings.TARGET_API_URL || "");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Removed manual ESC handler as Dialog handles it natively

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (targetApiUrl !== undefined)
        await updateSetting("TARGET_API_URL", targetApiUrl);
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

  const handleReset = async () => {
    try {
      setLoading(true);
      const { resetApplication } = await import("../../lib/api");
      await resetApplication();
      toast.success("Application réinitialisée avec succès !");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erreur lors de la réinitialisation",
      );
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
            Paramètres de l'Application Echo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="settings-name"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Target API URL
                </label>
                <Input
                  type="text"
                  value={targetApiUrl}
                  onChange={(e) => setTargetApiUrl(e.target.value)}
                  placeholder="Ex: http://localhost:8080"
                  className="focus-visible:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  L'URL vers laquelle le proxy redirige les requêtes
                  non-mockées.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-red-500 mb-2">
                Zone de Danger
              </h3>
              <p className="text-xs font-medium text-muted-foreground mb-4">
                Attention, cette action supprimera tous vos mocks actifs,
                configurations et scénarios. La collection redeviendra vierge.
              </p>

              <AlertDialog>
                <div className="flex justify-end">
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="font-medium"
                    >
                      Réinitialiser complètement l'application
                    </Button>
                  </AlertDialogTrigger>
                </div>
                <AlertDialogContent className="shadow-lg rounded-xl border border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-semibold text-xl text-red-600">
                      Réinitialisation complète
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Êtes-vous absolument sûr de vouloir réinitialiser
                      l'application ? Tout votre travail en cours (mocks,
                      scénarios) sera définitivement perdu.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      onClick={handleReset}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Oui, réinitialiser
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
