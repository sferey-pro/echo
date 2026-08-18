import { DownloadSimple } from "@phosphor-icons/react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { importCollection } from "@/client/lib/api";

interface ImportCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void | Promise<void>;
}

export function ImportCollectionModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportCollectionModalProps) {
  // biome-ignore lint/suspicious/noExplicitAny: FIXME - needs proper typing
  const [fileContent, setFileContent] = useState<any>(null);
  const [targetName, setTargetName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.repository || !json.echoState) {
          throw new Error(
            "Le fichier ne semble pas être un export Echo valide.",
          );
        }
        setFileContent(json);
        // Pre-fill target name from original repo URL
        if (json.repository.url) {
          const defaultName = json.repository.url
            .split("/")
            .pop()
            ?.replace(/\.git$/, "");
          if (defaultName) setTargetName(defaultName);
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Erreur de lecture du fichier JSON.",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileContent || !targetName) return;
    setIsImporting(true);
    try {
      await importCollection(targetName, fileContent);
      toast.success("Collection importée avec succès !");
      setFileContent(null);
      setTargetName("");
      onClose();
      await onImportSuccess();
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de l'importation.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFileContent(null);
    setTargetName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DownloadSimple weight="bold" className="w-5 h-5 text-primary" />
            Importer une Collection
          </DialogTitle>
          <DialogDescription>
            Importez un fichier de configuration Echo pour cloner et restaurer
            une collection complète.
          </DialogDescription>
        </DialogHeader>

        {!fileContent ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-muted/50">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              Sélectionner le fichier JSON
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            <div className="p-3 bg-muted rounded-lg text-sm flex flex-col gap-1">
              <div>
                <span className="font-bold">Repository :</span>{" "}
                {fileContent.repository.url}
              </div>
              <div>
                <span className="font-bold">Commit :</span>{" "}
                {fileContent.repository.commitSha || "latest"}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="import-name" className="text-sm font-semibold">
                Nom du dossier local (doit être unique)
              </label>
              <Input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Nom de la collection..."
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={isImporting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || !targetName}
              >
                {isImporting ? "Importation..." : "Importer et Cloner"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
