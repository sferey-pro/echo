import React, { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SplashScreen } from "./SplashScreen";
import { MethodBadge } from "../ui/method-badge";
import { Button } from "@/client/components/ui/button";
import { RequestList } from "../dashboard/RequestList";
import { RequestDetails } from "../dashboard/RequestDetails";
import type { ApiRequest, BrunoFolder } from "../../../shared/lib/parser";
import { ScenarioPanel } from "../dashboard/ScenarioPanel";
import { ScenarioEditor } from "../dashboard/ScenarioEditor";

import { SettingsModal } from "../dashboard/SettingsModal";
import { CollectionSettingsModal } from "../dashboard/CollectionSettingsModal";
import { CollectionManagerModal } from "../dashboard/CollectionManagerModal";
import { CommandPalette } from "../dashboard/CommandPalette";
import { EnvironmentViewerModal } from "../dashboard/EnvironmentViewerModal";
import { useStore } from "../../store/useStore";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Gear,
  CloudArrowDown,
  Spinner,
  FolderDashed,
  Eye,
} from "@phosphor-icons/react";
import { toast } from "sonner";

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
    setActiveEnvironment,
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

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isSynced: true,
    commitsBehind: 0,
    error: "",
    hasGit: false,
  });

  const checkStatus = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/sync/status?fetch=true");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkStatus();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkStatus]);

  // Rafraichir le status git après le chargement d'une nouvelle collection
  useEffect(() => {
    if (!isLoading) {
      checkStatus();
    }
  }, [isLoading, checkStatus]);

  const handleGitSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync/pull", { method: "POST" });
      if (res.ok) {
        setSyncStatus((prev) => ({
          ...prev,
          commitsBehind: 0,
          isSynced: true,
        }));
        loadCollection(); // Recharger la collection après le sync
        toast.success("Synchronisation réussie !");
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la synchronisation Git");
      }
    } catch {
      toast.error("Erreur réseau lors de la synchronisation Git");
    } finally {
      setIsSyncing(false);
    }
  };

  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!initialLoadDone.current) {
      loadCollection();
      initialLoadDone.current = true;
    }
  }, [loadCollection]);

  const handleEnvChange = (val: string) => {
    setActiveEnvironment(val);
  };

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

  const isPayloadModified = (req: ApiRequest) => {
    if (!req.variants || req.variants.length === 0) return false;
    const getPayloadStr = (data: unknown) => {
      if (typeof data === "string") return data;
      if (data === null || data === undefined) return "";
      return JSON.stringify(data, null, 2);
    };
    const defaultPayload = getPayloadStr(
      req.examples?.[0]?.response?.body?.data,
    );
    return req.variants.some((v) => v.payload !== defaultPayload);
  };

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: requestsInSelectedFolder.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 52, // approximate height of a row
    overscan: 5,
  });

  useEffect(() => {
    if (
      selectedRequest &&
      selectedRequest.folderId !== selectedFolderId &&
      selectedRequest.folderId !== "root"
    ) {
      setSelectedFolderId(selectedRequest.folderId);
    }
  }, [selectedRequest, selectedFolderId, setSelectedFolderId]);

  const showSplash = isLoading || !splashAnimationDone;

  if (showSplash && !isError) {
    return <SplashScreen onComplete={() => setSplashAnimationDone(true)} />;
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
      {/* Header Néo-brutaliste */}
      <div className="flex-none px-4 py-3 bg-card border-b border-border flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
            Echo
          </h1>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="ml-2 h-9 w-9 bg-blue-50 text-blue-700 hover:bg-blue-100"
            title="Paramètres Echo"
          >
            <Gear className="w-4 h-4" weight="bold" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus.hasGit && (
            <div className="mr-2 flex items-center border-r border-border pr-4">
              <Button
                variant="outline"
                onClick={handleGitSync}
                disabled={isSyncing}
                className={`flex items-center gap-2 ${
                  syncStatus.commitsBehind > 0
                    ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                    : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                } ${isSyncing ? "opacity-50 cursor-wait" : ""}`}
                title="Cliquer pour forcer la synchronisation avec Git"
              >
                {isSyncing ? (
                  <Spinner className="w-4 h-4 animate-spin" weight="bold" />
                ) : syncStatus.commitsBehind > 0 ? (
                  <CloudArrowDown className="w-4 h-4" weight="bold" />
                ) : (
                  <CloudArrowDown
                    className="w-4 h-4 opacity-50"
                    weight="bold"
                  />
                )}
                <span className="text-xs font-semibold">
                  {syncStatus.commitsBehind > 0
                    ? `${syncStatus.commitsBehind} Maj en attente`
                    : "Synchro OK"}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Grid 3 colonnes */}
      <div className="flex-1 min-h-0 w-full p-4 grid grid-cols-1 md:grid-cols-[280px_350px_1fr] xl:grid-cols-[300px_400px_1fr] gap-6 overflow-y-auto md:overflow-hidden">
        {/* Colonne 1 : Collection & Scénarios */}
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
                  value={activeEnvironment}
                  onValueChange={handleEnvChange}
                >
                  <SelectTrigger className="flex-1 h-7 text-xs bg-white text-black focus:ring-0">
                    <SelectValue placeholder="Aucun env." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="" className="text-xs">
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
                  onClick={() => setIsEnvViewerOpen(true)}
                  className="h-7 w-7 bg-green-50 text-green-700 hover:bg-green-100 shrink-0"
                  title="Voir les variables d'environnement"
                >
                  <Eye className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <RequestList
                onOpenSettings={() => setIsCollectionSettingsOpen(true)}
                onOpenCollections={() => setIsCollectionsOpen(true)}
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

        {/* Colonne 2 : Liste des requêtes du dossier */}
        <div className="flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm min-h-[500px] md:h-full">
          <div className="bg-muted/50 p-3 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider truncate">
              Requêtes : {selectedFolderName}
            </h2>
          </div>
          <div
            ref={scrollParentRef}
            className="flex-1 overflow-y-auto p-0 bg-card"
          >
            {requestsInSelectedFolder.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center min-h-[300px]">
                <FolderDashed
                  className="w-12 h-12 mb-4 opacity-20"
                  weight="duotone"
                />
                <p className="text-sm font-medium text-foreground/70">
                  Aucune requête à afficher
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Sélectionnez un dossier contenant des requêtes.
                </p>
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const req = requestsInSelectedFolder[virtualRow.index];
                  if (!req) return null;
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      onClick={() => setSelectedRequestId(req.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setSelectedRequestId(req.id);
                      }}
                      tabIndex={0}
                      className={`flex items-center px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selectedRequestId === req.id ? "bg-primary/5 border-l-4 border-l-primary border-b-border" : "bg-transparent hover:bg-muted/30 border-l-4 border-l-transparent border-b-border"}`}
                    >
                      <span className="font-semibold text-muted-foreground mr-3 text-sm w-4">
                        {virtualRow.index + 1}
                      </span>
                      <MethodBadge method={req.method} className="mr-3" />
                      <span className="font-medium flex-1 truncate text-sm">
                        {req.name}
                      </span>
                      {isPayloadModified(req) && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium ml-2 shadow-sm">
                          Modifié
                        </span>
                      )}
                      {req.variants?.some((v) => v.isMocked) &&
                        !isPayloadModified(req) && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium ml-2 shadow-sm">
                            Mock Actif
                          </span>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne 2 : Détails de la Requête */}
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
