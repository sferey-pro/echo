import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import type { MockVariantDef } from "@/shared/schemas";
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
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface VariantSelectorProps {
  variants: MockVariantDef[];
  activeVariantId: string;
  onVariantChange: (id: string) => void;
  isSaving: boolean;
  onCreateVariant: (name: string) => Promise<void>;
  onDeleteVariant: () => Promise<void>;
  onRenameVariant: (newName: string) => Promise<void>;
}

export function VariantSelector({
  variants,
  activeVariantId,
  onVariantChange,
  isSaving,
  onCreateVariant,
  onDeleteVariant,
  onRenameVariant,
}: VariantSelectorProps) {
  const [isCreateVariantOpen, setIsCreateVariantOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [isRenameVariantOpen, setIsRenameVariantOpen] = useState(false);
  const [renameVariantName, setRenameVariantName] = useState("");

  const submitCreate = async () => {
    if (!newVariantName.trim()) return;
    await onCreateVariant(newVariantName.trim());
    setIsCreateVariantOpen(false);
    setNewVariantName("");
  };

  const submitRename = async () => {
    if (!renameVariantName.trim()) return;
    await onRenameVariant(renameVariantName.trim());
    setIsRenameVariantOpen(false);
    setRenameVariantName("");
  };

  const activeVariant = variants.find((v) => v.id === activeVariantId);

  return (
    <div className="flex flex-col gap-2 shrink-0 bg-muted p-3 rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-bold uppercase text-muted-foreground">
          Variante active :
        </span>
        <div className="flex items-center gap-1">
          <Dialog
            open={isCreateVariantOpen}
            onOpenChange={setIsCreateVariantOpen}
          >
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                title="Créer une variante"
              >
                <Plus weight="bold" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-bold text-xl text-foreground">
                  Créer une variante
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Nom de la nouvelle variante (ex: Erreur 404, Admin User) :
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  className="w-full"
                  autoFocus
                  placeholder="Nom de la variante"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newVariantName.trim() && !isSaving)
                      submitCreate();
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreateVariantOpen(false);
                    setNewVariantName("");
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    submitCreate();
                  }}
                  disabled={!newVariantName.trim() || isSaving}
                >
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                title="Supprimer la variante"
                disabled={variants.length <= 1 || isSaving}
              >
                <Trash weight="bold" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la variante ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer la variante "
                  {activeVariant?.name}" ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    onDeleteVariant();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex gap-2">
        <Select
          value={activeVariantId || "__none__"}
          onValueChange={(val) => {
            const trueVal = val === "__none__" ? "" : val;
            onVariantChange(trueVal);
          }}
        >
          <SelectTrigger className="w-48 bg-background border-border font-bold">
            <SelectValue placeholder="Sélectionner une variante" />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem key={v.id} value={v.id || "__none__"}>
                <div className="flex items-center gap-2">
                  <span>{v.name}</span>
                  {v.isMocked && (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog
          open={isRenameVariantOpen}
          onOpenChange={(open) => {
            if (open) setRenameVariantName(activeVariant?.name || "");
            setIsRenameVariantOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background border-border shrink-0"
              title="Renommer la variante"
            >
              <PencilSimple weight="bold" className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold text-xl text-foreground">
                Renommer la variante
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Nouveau nom pour la variante :
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                className="w-full"
                autoFocus
                placeholder="Nouveau nom"
                value={renameVariantName}
                onChange={(e) => setRenameVariantName(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    renameVariantName.trim() &&
                    !isSaving
                  )
                    submitRename();
                }}
              />
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsRenameVariantOpen(false);
                  setRenameVariantName("");
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  submitRename();
                }}
                disabled={
                  !renameVariantName.trim() ||
                  isSaving ||
                  renameVariantName === activeVariant?.name
                }
              >
                Renommer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
