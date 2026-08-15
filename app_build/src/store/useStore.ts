import { create } from 'zustand';
import type { BrunoFolder, ApiRequest, BrunoEnvironment } from '../lib/parser';
import { fetchCollection, getSettings, updateSetting } from '../lib/api';

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

  // Actions
  setFolders: (folders: BrunoFolder[]) => void;
  setRequests: (requests: ApiRequest[]) => void;
  setEnvironments: (environments: BrunoEnvironment[]) => void;
  
  setSelectedRequestId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedScenarioId: (id: string | null) => void;
  setActiveEnvironment: (env: string) => void;
  
  // Thunks
  loadCollection: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  folders: [],
  requests: [],
  environments: [],
  
  selectedRequestId: null,
  selectedFolderId: null,
  selectedScenarioId: null,
  activeEnvironment: '',
  
  isLoading: true,

  setFolders: (folders) => set({ folders }),
  setRequests: (requests) => set({ requests }),
  setEnvironments: (environments) => set({ environments }),
  
  setSelectedRequestId: (id) => set({ selectedRequestId: id }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
  setSelectedScenarioId: (id) => set({ selectedScenarioId: id }),
  
  setActiveEnvironment: (env) => {
    set({ activeEnvironment: env });
    updateSetting('ACTIVE_ENVIRONMENT', env);
  },

  loadCollection: async () => {
    set({ isLoading: true });
    try {
      const [data, settings] = await Promise.all([fetchCollection(), getSettings()]);
      set({
        folders: data.folders,
        requests: data.requests,
        environments: data.environments || [],
        activeEnvironment: settings['ACTIVE_ENVIRONMENT'] || '',
        isLoading: false
      });
    } catch (error) {
      console.error("Failed to load collection", error);
      set({ isLoading: false });
    }
  }
}));
