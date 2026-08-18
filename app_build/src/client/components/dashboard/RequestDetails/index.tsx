import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ApiRequest } from "../../../../shared/lib/parser";
import {
  createMockVariant,
  deleteMockVariant,
  updateMockVariant,
  updateRequestMeta,
} from "../../../lib/api";
import { useStore } from "../../../store/useStore";
import { RequestHeader } from "./RequestHeader";
import { VariantEditor } from "./VariantEditor";
import { VariantSelector } from "./VariantSelector";

export function RequestDetails() {
  const {
    requests,
    environments,
    activeEnvironment,
    selectedRequestId,
    loadCollection,
    updateLocalVariant,
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

  const getPayloadString = (data: unknown) => {
    if (typeof data === "string") return data;
    if (data === null || data === undefined) return "";
    return JSON.stringify(data, null, 2);
  };

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
  const [isSaving, setIsSaving] = useState(false);

  // Sync local states when active variant changes
  useEffect(() => {
    if (activeVariant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: Exception (React constraint) - Intentionally omitting deps to prevent infinite loops or overwriting local state
  }, [request, activeVariant, getPayloadString]);

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
    setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  const handleSavePayload = async () => {
    if (!activeVariant || !request) return;
    setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newCode: number) => {
    if (!activeVariant || !request) return;
    setStatusCode(newCode);
    setIsSaving(true);
    try {
      await checkAndResolveConflicts(
        activeVariant.isMocked,
        pathParamsOverrides,
      );

      const updates = {
        statusCode: newCode,
        payload,
        selectedExample,
        latencyMs,
        pathParamsOverrides,
      };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erreur lors du changement de statut",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLatencyChange = async (newLatency: number) => {
    if (!activeVariant || !request) return;
    setIsSaving(true);
    try {
      const updates = {
        latencyMs: newLatency,
        payload,
        selectedExample,
        statusCode,
        pathParamsOverrides,
      };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erreur lors du changement de latence",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const _handleParamChange = async (key: string, value: string) => {
    if (!activeVariant || !request) return;
    const newOverrides = { ...pathParamsOverrides, [key]: value };
    if (!value) delete newOverrides[key];
    setPathParamsOverrides(newOverrides);

    setIsSaving(true);
    try {
      const updates = {
        pathParamsOverrides: newOverrides,
        payload,
        selectedExample,
        statusCode,
        latencyMs,
      };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour des paramètres",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExampleClick = async (
    ex: NonNullable<ApiRequest["examples"]>[0],
  ) => {
    if (!activeVariant || !request) return;
    setSelectedExample(ex.name);
    const newPayload = getPayloadString(ex.response?.body?.data);
    setPayload(newPayload);
    const newStatus =
      // biome-ignore lint/suspicious/noExplicitAny: Exception (Type constraint) - Cannot provide strict types for arbitrary external mock structures or unknown payloads
      ex.response?.status || (ex as any).res?.status || statusCode;
    setStatusCode(newStatus);
    setIsSaving(true);
    try {
      const updates = {
        payload: newPayload,
        selectedExample: ex.name,
        statusCode: newStatus,
        latencyMs,
        pathParamsOverrides,
      };
      await updateMockVariant(activeVariant.id, updates);
      updateLocalVariant(request.id, activeVariant.id, updates);
    } catch (e: unknown) {
      toast.error(`Erreur: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayloadChange = (value: string | undefined) => {
    setPayload(value || "");
    setSelectedExample("custom");
  };

  const handleToggleStar = async () => {
    if (!request) return;
    setIsSaving(true);
    await updateRequestMeta(request.id, !request.isStarred);
    await loadCollection();
    setIsSaving(false);
  };

  const submitCreateVariant = async (newVariantName: string) => {
    if (!request) return;
    setIsSaving(true);
    try {
      const newId = await createMockVariant(request.id, newVariantName);
      await loadCollection();
      setActiveVariantId(newId);
      toast.success("Variante créée");
    } catch {
      toast.error("Erreur création variante");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (!activeVariant) return;
    setIsSaving(true);
    try {
      await deleteMockVariant(activeVariant.id);
      await loadCollection();
      toast.success("Variante supprimée");
    } catch {
      toast.error("Erreur suppression variante");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameVariant = async (newName: string) => {
    if (!activeVariant || !request) return;
    setIsSaving(true);
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
      setIsSaving(false);
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
            onVariantChange={setActiveVariantId}
            isSaving={isSaving}
            onCreateVariant={submitCreateVariant}
            onDeleteVariant={handleDeleteVariant}
            onRenameVariant={handleRenameVariant}
          />
        </div>
      </div>

      <VariantEditor
        request={request}
        activeVariant={activeVariant}
        isSaving={isSaving}
        onToggleMock={handleToggleMock}
        onSavePayload={handleSavePayload}
        statusCode={statusCode}
        onStatusChange={handleStatusChange}
        latencyMs={latencyMs}
        onLatencyChange={handleLatencyChange}
        selectedExample={selectedExample}
        onExampleChange={(exName) => {
          if (exName === "custom") {
            setSelectedExample("custom");
          } else {
            const ex = request.examples?.find((e) => e.name === exName);
            if (ex) handleExampleClick(ex);
          }
        }}
        payload={payload}
        onPayloadChange={handlePayloadChange}
        defaultExamplePayload={defaultExamplePayload}
        onResetPayload={() => {
          setPayload(defaultExamplePayload);
          setSelectedExample(request.examples?.[0]?.name || "custom");
        }}
      />
    </div>
  );
}
