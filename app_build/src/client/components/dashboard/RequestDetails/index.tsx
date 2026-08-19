import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import type { ApiRequest } from "../../../../shared/lib/parser";
import {
  createMockVariant,
  deleteMockVariant,
  updateMockVariant,
  updateRequestMeta,
} from "../../../lib/api";
import { useStore } from "../../../store/useStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { RequestHeader } from "./RequestHeader";
import { VariantEditor } from "./VariantEditor";
import { VariantSelector } from "./VariantSelector";

const getPayloadString = (data: unknown) => {
  if (typeof data === "string") return data;
  if (data === null || data === undefined) return "";
  return JSON.stringify(data, null, 2);
};

export function RequestDetails() {
  const {
    requests,
    environments,
    activeEnvironment,
    selectedRequestId,
    loadCollection,
    updateLocalVariant,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useStore();

  const request = requests.find((r) => r.id === selectedRequestId) || null;
  const variants = request?.variants || [];
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0]?.id || null : null,
  );

  // If active variant doesn't match selected request, select the default one
  useEffect(() => {
    if (
      request &&
      (!activeVariantId || !variants.find((v) => v.id === activeVariantId)) &&
      variants.length > 0
    ) {
      setActiveVariantId(variants[0]?.id || null);
    }
  }, [request, activeVariantId, variants]);

  const activeVariant = variants.find((v) => v.id === activeVariantId) || null;

  const defaultExamplePayload = getPayloadString(
    request?.examples?.[0]?.response?.body?.data,
  );

  // Local states for the active variant to ensure smooth typing
  const [payload, setPayload] = useState(
    activeVariant?.payload ?? defaultExamplePayload,
  );
  const [selectedExample, setSelectedExample] = useState<string>(
    activeVariant?.selectedExample ?? request?.examples?.[0]?.name ?? "custom",
  );
  const [statusCode, setStatusCode] = useState<number>(
    activeVariant?.statusCode ?? 200,
  );
  const [latencyMs, setLatencyMs] = useState<number>(
    activeVariant?.latencyMs ?? 0,
  );
  const [pathParamsOverrides, setPathParamsOverrides] = useState<
    Record<string, string>
  >(activeVariant?.pathParamsOverrides || {});
  const [savingAction, setSavingAction] = useState<
    | "toggle"
    | "payload"
    | "status"
    | "latency"
    | "pathParams"
    | "example"
    | null
  >(null);
  const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);

  // Initialize local states ONLY when active variant ID changes
  const prevVariantIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeVariant && activeVariant.id !== prevVariantIdRef.current) {
      setPayload(
        activeVariant.payload ??
          getPayloadString(request?.examples?.[0]?.response?.body?.data),
      );
      setSelectedExample(
        activeVariant.selectedExample ??
          request?.examples?.[0]?.name ??
          "custom",
      );
      setStatusCode(activeVariant.statusCode ?? 200);
      setLatencyMs(activeVariant.latencyMs ?? 0);
      setPathParamsOverrides(activeVariant.pathParamsOverrides || {});
      prevVariantIdRef.current = activeVariant.id;
      setHasUnsavedChanges(false);
    }
  }, [activeVariant, request, setHasUnsavedChanges]);

  // Calculate hasUnsavedChanges dynamically
  const hasUnsavedChangesLocal = useMemo(() => {
    if (!activeVariant) return false;
    const basePayload =
      activeVariant.payload ??
      getPayloadString(request?.examples?.[0]?.response?.body?.data);
    if (payload !== basePayload) return true;
    if (statusCode !== (activeVariant.statusCode ?? 200)) return true;
    if (
      JSON.stringify(pathParamsOverrides) !==
      JSON.stringify(activeVariant.pathParamsOverrides || {})
    )
      return true;
    return false;
  }, [
    activeVariant,
    payload,
    statusCode,
    pathParamsOverrides,
    request,
  ]);

  // Sync local unsaved changes with global store
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChangesLocal);
  }, [hasUnsavedChangesLocal, setHasUnsavedChanges]);

  const urlParams = useMemo(() => {
    if (!request?.url) return { variables: [], pathParams: [] };

    const vars = Array.from(request.url.matchAll(/\{\{([^}]+)\}\}/g)).map(
      (m) => m[1] as string,
    );
    const paths = Array.from(request.url.matchAll(/:([a-zA-Z0-9_]+)/g)).map(
      (m) => m[1] as string,
    );

    return {
      variables: [...new Set(vars)],
      pathParams: [...new Set(paths)],
    };
  }, [request]);

  const currentEnv = environments.find((e) => e.name === activeEnvironment);
  const _getEnvValue = (key: string) => {
    return (
      currentEnv?.variables.find((v) => v.name === key)?.value || "Non défini"
    );
  };

  const checkAndResolveConflicts = async (
    targetIsMocked: boolean,
    targetOverrides: Record<string, string>,
  ) => {
    if (!request || !targetIsMocked) return;

    const isSameOverrides = (
      a: Record<string, string>,
      b: Record<string, string>,
    ) => {
      const keysA = Object.keys(a || {}).filter((k) => a[k]);
      const keysB = Object.keys(b || {}).filter((k) => b[k]);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (a[key] !== b[key]) return false;
      }
      return true;
    };

    const conflicts = (request.variants || []).filter(
      (v) =>
        v.id !== activeVariantId &&
        v.isMocked &&
        isSameOverrides(v.pathParamsOverrides || {}, targetOverrides || {}),
    );

    for (const conflict of conflicts) {
      await updateMockVariant(conflict.id, { isMocked: false });
      updateLocalVariant(request.id, conflict.id, { isMocked: false });
      toast.info(
        `La variante "${conflict.name}" a été désactivée automatiquement pour éviter un doublon.`,
        { duration: 5000 },
      );
    }
  };

  const handleToggleMock = async () => {
    if (!activeVariant || !request) return;
    setSavingAction("toggle");
    try {
      const newIsMocked = !activeVariant.isMocked;
      await checkAndResolveConflicts(newIsMocked, pathParamsOverrides);

      const updates = {
        isMocked: newIsMocked,
        payload,
        statusCode,
        latencyMs,
        pathParamsOverrides,
      };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour",
      );
    } finally {
      setSavingAction(null);
    }
  };

  const handleSavePayload = async () => {
    if (!activeVariant || !request) return;
    setSavingAction("payload");
    try {
      await checkAndResolveConflicts(
        activeVariant.isMocked,
        pathParamsOverrides,
      );

      const updates = {
        payload,
        selectedExample,
        statusCode,
        latencyMs,
        pathParamsOverrides,
      };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
      toast.success("Variante sauvegardée");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde",
      );
    } finally {
      setSavingAction(null);
    }
  };

  const handleLatencySave = async (newLatency: number) => {
    if (!activeVariant || !request) return;
    try {
      const updates = { latencyMs: newLatency };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
    } catch (e: unknown) {
      toast.error(`Erreur de sauvegarde de latence`);
    }
  };

  const handleStatusChange = (newCode: number) => {
    setStatusCode(newCode);
  };

  const handleLatencyChange = (newLatency: number) => {
    setLatencyMs(newLatency);
  };

  const _handleParamChange = (key: string, value: string) => {
    const newOverrides = { ...pathParamsOverrides, [key]: value };
    if (!value) delete newOverrides[key];
    setPathParamsOverrides(newOverrides);
  };

  const handleExampleClick = async (
    ex: NonNullable<ApiRequest["examples"]>[0],
  ) => {
    if (!activeVariant || !request) return;
    setSelectedExample(ex.name);
    const newPayload = getPayloadString(ex.response?.body?.data);
    setPayload(newPayload);
    const newStatus =
      ex.response?.status ||
      (ex as { res?: { status: number } }).res?.status ||
      statusCode;
    setStatusCode(newStatus);
    setSavingAction("example");
    try {
      const updates = {
        payload: newPayload,
        selectedExample: ex.name,
        statusCode: newStatus,
        pathParamsOverrides,
      };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
    } catch (e: unknown) {
      toast.error(`Erreur: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingAction(null);
    }
  };

  const handlePayloadChange = (value: string | undefined) => {
    setPayload(value || "");
    setSelectedExample("custom");
  };

  const handleToggleStar = async () => {
    if (!request) return;
    setSavingAction("toggle");
    await updateRequestMeta(request.id, !request.isStarred);
    await loadCollection();
    setSavingAction(null);
  };

  const submitCreateVariant = async (newVariantName: string) => {
    if (!request) return;
    setSavingAction("toggle");
    try {
      const newId = await createMockVariant(request.id, newVariantName);
      await loadCollection();
      setActiveVariantId(newId);
      toast.success("Variante créée");
    } catch {
      toast.error("Erreur création variante");
    } finally {
      setSavingAction(null);
    }
  };

  const handleDeleteVariant = async () => {
    if (!activeVariant) return;
    setSavingAction("toggle");
    try {
      await deleteMockVariant(activeVariant.id);
      await loadCollection();
      toast.success("Variante supprimée");
    } catch {
      toast.error("Erreur suppression variante");
    } finally {
      setSavingAction(null);
    }
  };

  const handleRenameVariant = async (newName: string) => {
    if (!activeVariant || !request) return;
    setSavingAction("toggle");
    try {
      const updates = { name: newName };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
      toast.success("Variante renommée");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors du renommage",
      );
    } finally {
      setSavingAction(null);
    }
  };

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center min-h-[300px] bg-transparent">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-muted/30 flex items-center justify-center border border-border/50">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-40"
          >
            <title>File Icon</title>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <p className="text-base font-semibold text-foreground/70">
          Aucune requête sélectionnée
        </p>
        <p className="text-sm mt-1.5 text-muted-foreground max-w-sm">
          Sélectionnez une requête dans le panneau de gauche pour voir ses
          détails et configurer ses mocks.
        </p>
      </div>
    );
  }

  if (!activeVariant) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center text-muted-foreground space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/50">
          <MagnifyingGlass
            className="w-12 h-12 text-muted-foreground opacity-50"
            weight="duotone"
          />
        </div>
        <p className="font-medium">
          Sélectionnez une requête pour voir les détails
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden font-sans">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-card border-b border-border z-10">
        <div className="flex-1 w-full xl:w-auto">
          <RequestHeader
            request={request}
            isStarred={!!request.isStarred}
            onToggleStar={handleToggleStar}
            urlParams={urlParams}
            pathParamsOverrides={pathParamsOverrides}
            onPathParamChange={(param, value) =>
              setPathParamsOverrides({
                ...pathParamsOverrides,
                [param]: value,
              })
            }
            onPathParamBlur={() => {}}
          />
        </div>
        <div className="p-4 pt-0 xl:pt-4 xl:pl-0 shrink-0 self-stretch xl:self-auto flex items-center">
          <VariantSelector
            variants={variants}
            activeVariantId={activeVariant.id}
            onVariantChange={(id) => {
              if (hasUnsavedChangesLocal) {
                setPendingVariantId(id);
              } else {
                setActiveVariantId(id);
              }
            }}
            isSaving={savingAction === "toggle"}
            onCreateVariant={submitCreateVariant}
            onDeleteVariant={handleDeleteVariant}
            onRenameVariant={handleRenameVariant}
          />
        </div>
      </div>

      <VariantEditor
        request={request}
        activeVariant={activeVariant}
        hasUnsavedChanges={hasUnsavedChangesLocal}
        isTogglingMock={savingAction === "toggle"}
        isSavingPayload={savingAction === "payload"}
        onToggleMock={handleToggleMock}
        onSavePayload={handleSavePayload}
        statusCode={statusCode}
        onStatusChange={handleStatusChange}
        latencyMs={latencyMs}
        onLatencyChange={handleLatencyChange}
        onLatencySave={handleLatencySave}
        selectedExample={selectedExample}
        onExampleChange={(exName) => {
          if (exName === "custom") {
            setSelectedExample("custom");
            setPayload(activeVariant?.payload ?? defaultExamplePayload);
            setStatusCode(activeVariant?.statusCode ?? 200);
            // On ne sauvegarde pas, on restaure juste le brouillon depuis la base (ce qui annule les modifications non sauvegardées).
          } else {
            const ex = request.examples?.find((e) => e.name === exName);
            if (ex) handleExampleClick(ex);
          }
        }}
        payload={payload}
        onPayloadChange={handlePayloadChange}
        defaultExamplePayload={defaultExamplePayload}
      />

      <AlertDialog open={!!pendingVariantId} onOpenChange={(open) => !open && setPendingVariantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications en cours. Si vous changez de variante, elles seront perdues. Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingVariantId(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { setActiveVariantId(pendingVariantId); setPendingVariantId(null); }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Changer de variante
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
