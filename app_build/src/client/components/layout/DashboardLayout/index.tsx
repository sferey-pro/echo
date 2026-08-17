import React, { useState, useEffect, useCallback } from "react";
import { SplashScreen } from "../SplashScreen";
import { RequestDetails } from "../../dashboard/RequestDetails";
import type { BrunoFolder } from "../../../../shared/lib/parser";
import { ScenarioEditor } from "../../dashboard/ScenarioEditor";
import { SettingsModal } from "../../dashboard/SettingsModal";
import { CollectionSettingsModal } from "../../dashboard/CollectionSettingsModal";
import { CollectionManagerModal } from "../../dashboard/CollectionManagerModal";
import { CommandPalette } from "../../dashboard/CommandPalette";
import { EnvironmentViewerModal } from "../../dashboard/EnvironmentViewerModal";
import { useStore } from "../../../store/useStore";
import { Button } from "../../ui/button";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { FolderContent } from "./FolderContent";

export function DashboardLayout() {
  const {
    folders,
    requests,
    environments,
    activeEnvironment,
    isLoading,
    isError,
    errorMessage,
    selectedRequestId,
    selectedFolderId,
    selectedScenarioId,
    setSelectedFolderId,
    setSelectedRequestId,
    setSelectedScenarioId,
    loadCollection,
  } = useStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollectionSettingsOpen, setIsCollectionSettingsOpen] =
    useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEnvViewerOpen, setIsEnvViewerOpen] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  useEffect(() => {
    if (
      selectedRequestId &&
      requests.length > 0
    ) {
      const selectedRequest = requests.find((r) => r.id === selectedRequestId);
      if (
        selectedRequest &&
        selectedRequest.folderId !== selectedFolderId &&
        selectedRequest.folderId !== "root"
      ) {
        setSelectedFolderId(selectedRequest.folderId);
      }
    }
  }, [selectedRequestId, requests, selectedFolderId, setSelectedFolderId]);

  const selectedRequest =
    requests.find((r) => r.id === selectedRequestId) || null;

  const getDescendantFolderIds = (
    folderList: BrunoFolder[],
    targetId: string,
  ): string[] => {
    const result: string[] = [];
    const findFolder = (list: BrunoFolder[]): BrunoFolder | null => {
      for (const f of list) {
        if (f.id === targetId) return f;
        if (f.children) {
          const found = findFolder(f.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetFolder = findFolder(folderList);
    if (!targetFolder) return [targetId];

    const collectIds = (folder: BrunoFolder) => {
      result.push(folder.id);
      if (folder.children) {
        folder.children.forEach(collectIds);
      }
    };

    collectIds(targetFolder);
    return result;
  };

  const targetFolderIds = selectedFolderId
    ? getDescendantFolderIds(folders, selectedFolderId)
    : [];
  const requestsInSelectedFolder = selectedFolderId
    ? requests.filter((r) => targetFolderIds.includes(r.folderId))
    : requests;

  const getFolderName = (
    folderList: BrunoFolder[],
    id: string | null,
  ): string => {
    if (!id || id === "root") return "Toutes les requêtes";
    for (const f of folderList) {
      if (f.id === id) return f.name;
      if (f.children) {
        const found = getFolderName(f.children, id);
        if (found !== "Toutes les requêtes") return found;
      }
    }
    return "Toutes les requêtes";
  };

  const selectedFolderName = getFolderName(folders, selectedFolderId);

  const showSplash = isLoading || !splashAnimationDone;

  const handleSplashComplete = useCallback(() => {
    setSplashAnimationDone(true);
  }, []);

  if (showSplash && !isError) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (isError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-foreground">
        <div className="p-8 max-w-md w-full bg-white rounded-xl shadow-sm border border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Erreur de chargement
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            {errorMessage || "Une erreur inconnue s'est produite."}
          </p>
          <Button onClick={() => loadCollection(true)} className="w-full">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 text-foreground overflow-hidden flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Grid 3 colonnes */}
      <div className="flex-1 min-h-0 w-full p-4 grid grid-cols-1 md:grid-cols-[280px_350px_1fr] xl:grid-cols-[300px_400px_1fr] gap-6 overflow-y-auto md:overflow-hidden">
        {/* Colonne 1 : Collection & Scénarios */}
        <Sidebar
          onOpenEnvViewer={() => setIsEnvViewerOpen(true)}
          onOpenCollectionSettings={() => setIsCollectionSettingsOpen(true)}
          onOpenCollections={() => setIsCollectionsOpen(true)}
        />

        {/* Colonne 2 : Liste des requêtes du dossier */}
        <FolderContent
          selectedFolderName={selectedFolderName}
          requestsInSelectedFolder={requestsInSelectedFolder}
        />

        {/* Colonne 3 : Détails de la Requête */}
        <div className="flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm min-h-[500px] md:h-full">
          <div className="bg-muted/50 p-3 border-b border-border">
            <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider truncate">
              Édition du mock : {selectedRequest?.name || "Aucune Sélection"}
            </h2>
          </div>
          <div className="flex-1 overflow-hidden bg-card">
            <RequestDetails key={selectedRequest?.id} />
          </div>
        </div>
      </div>

      <CommandPalette
        open={isCommandPaletteOpen}
        setOpen={setIsCommandPaletteOpen}
        requests={requests}
        onSelectRequest={setSelectedRequestId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCollectionManager={() => setIsCollectionsOpen(true)}
      />

      {selectedScenarioId && (
        <ScenarioEditor
          key={selectedScenarioId}
          scenarioId={selectedScenarioId}
          requests={requests}
          onUpdate={loadCollection}
          onClose={() => setSelectedScenarioId(null)}
        />
      )}

      <CollectionManagerModal
        isOpen={isCollectionsOpen}
        onClose={() => setIsCollectionsOpen(false)}
        onSaved={() => loadCollection(true)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => loadCollection(true)}
      />
      <CollectionSettingsModal
        isOpen={isCollectionSettingsOpen}
        onClose={() => setIsCollectionSettingsOpen(false)}
        onSaved={() => loadCollection(true)}
      />
      <EnvironmentViewerModal
        isOpen={isEnvViewerOpen}
        onClose={() => setIsEnvViewerOpen(false)}
        environments={environments}
        activeEnvironmentName={activeEnvironment}
      />
    </div>
  );
}
