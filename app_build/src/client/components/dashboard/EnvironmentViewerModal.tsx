import React, { useState, useEffect } from "react";
import type { BrunoEnvironment } from "../../../shared/lib/parser";
import { GlobeHemisphereWest, Question, Tray } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";

interface EnvironmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: BrunoEnvironment[];
  activeEnvironmentName: string;
}

export function EnvironmentViewerModal({
  isOpen,
  onClose,
  environments,
  activeEnvironmentName,
}: EnvironmentViewerModalProps) {
  const activeEnvName = activeEnvironmentName;
  const activeEnv = environments.find((e) => e.name === activeEnvName);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-background">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Tray className="w-6 h-6 text-primary" weight="fill" /> Visionneuse
            d'Environnement
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 bg-background max-h-[60vh] overflow-y-auto">
          {!activeEnvName ? (
            <div className="p-8 border border-dashed border-border rounded-xl text-center flex flex-col items-center">
              <Tray
                className="w-10 h-10 mb-3 text-muted-foreground opacity-80"
                weight="duotone"
              />
              <p className="font-semibold text-foreground">
                Aucun environnement actif
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Sélectionnez un environnement dans la liste déroulante pour voir
                ses variables.
              </p>
            </div>
          ) : !activeEnv ? (
            <div className="p-8 border border-dashed border-red-200 rounded-xl text-center text-red-600 flex flex-col items-center bg-red-50/50">
              <p className="font-semibold">Environnement introuvable</p>
              <p className="text-xs mt-2">
                L'environnement sélectionné ({activeEnvName}) n'existe plus.
              </p>
            </div>
          ) : activeEnv.variables.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-xl text-center flex flex-col items-center">
              <Tray
                className="w-10 h-10 mb-3 text-muted-foreground opacity-80"
                weight="duotone"
              />
              <p className="font-semibold text-foreground">
                Aucune variable définie
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                L'environnement {activeEnv.name} ne contient aucune variable.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="bg-muted/50 p-3 border-b border-border">
                <h3 className="font-semibold text-foreground">
                  Variables de l'environnement : {activeEnv.name}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-medium">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="p-3 border-r border-border w-1/3 text-foreground">
                        Nom
                      </th>
                      <th className="p-3 text-foreground">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEnv.variables.map((v, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3 border-r border-border font-mono text-xs text-foreground">
                          {v.name}
                        </td>
                        <td className="p-3 font-mono text-xs text-foreground break-all">
                          {v.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
