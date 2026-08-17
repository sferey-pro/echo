import { create } from "zustand";
import type {
  BrunoFolder,
  ApiRequest,
  BrunoEnvironment,
} from "../../shared/lib/parser";
import { fetchCollection, getSettings, updateSetting } from "../lib/api";
import type { MockVariantDef } from "../../server/lib/db";

interface AppState {
  // Data
  folders: BrunoFolder[];
  requests: ApiRequest[];
  environments: BrunoEnvironment[];

  // UI Selection State
  selectedRequestId: string | null;
  selectedFolderId: string | null;
  selectedScenarioId: string | null;
  activeEnvironment: string;

  // Loading State
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;

  // Actions
  setFolders: (folders: BrunoFolder[]) => void;
  setRequests: (requests: ApiRequest[]) => void;
  setEnvironments: (environments: BrunoEnvironment[]) => void;
  updateLocalVariant: (
    requestId: string,
    variantId: string,
    updates: Partial<MockVariantDef>,
  ) => void;

  setSelectedRequestId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedScenarioId: (id: string | null) => void;
  setActiveEnvironment: (env: string) => void;

  // Thunks
  loadCollection: (forceLoader?: boolean) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  folders: [],
  requests: [],
  environments: [],

  selectedRequestId: null,
  selectedFolderId: null,
  selectedScenarioId: null,
  activeEnvironment: "",

  isLoading: true,
  isError: false,
  errorMessage: null,

  setFolders: (folders) => set({ folders }),
  setRequests: (requests) => set({ requests }),
  setEnvironments: (environments) => set({ environments }),
  updateLocalVariant: (requestId, variantId, updates) =>
    set((state) => ({
      requests: state.requests.map((r) => {
        if (r.id !== requestId) return r;
        const newVariants = (r.variants || []).map((v) => {
          if (v.id === variantId) {
            return { ...v, ...updates };
          }
          // If we set isMocked on one variant, we might want to unset it on others locally?
          // Let's assume the server takes care of the DB, but locally we should reflect that only one variant can be active
          if (
            updates.isMocked !== undefined &&
            updates.isMocked &&
            v.id !== variantId
          ) {
            return { ...v, isMocked: false };
          }
          return v;
        });
        return { ...r, variants: newVariants };
      }),
    })),

  setSelectedRequestId: (id) => set({ selectedRequestId: id }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSelectedScenarioId: (id) => set({ selectedScenarioId: id }),

  setActiveEnvironment: async (env) => {
    set({ activeEnvironment: env });
    await updateSetting("ACTIVE_ENVIRONMENT", env);
    get().loadCollection(true);
  },

  loadCollection: async (forceLoader = false) => {
    if (get().requests.length === 0 || forceLoader) {
      set({ isLoading: true, isError: false, errorMessage: null });
    }
    try {
      const [data, settings] = await Promise.all([
        fetchCollection(),
        getSettings(),
      ]);
      set({
        folders: data.folders,
        requests: data.requests,
        environments: data.environments || [],
        activeEnvironment: settings["ACTIVE_ENVIRONMENT"] || "",
        isLoading: false,
        isError: false,
        errorMessage: null,
      });
    } catch (error) {
      console.error("Failed to load collection", error);
      set({
        isLoading: false,
        isError: true,
        errorMessage:
          error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  },
}));
