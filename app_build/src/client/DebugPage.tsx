import { create } from "zustand";
import { JsonEditor } from "./components/ui/json-editor";

interface DebugStore {
  payload: string;
  setPayload: (payload: string) => void;
}

const useDebugStore = create<DebugStore>((set) => ({
  payload: '{\n  "status": "ok",\n  "message": "Debug mode avec Zustand"\n}',
  setPayload: (payload) => set({ payload }),
}));

export function DebugPage() {
  const payload = useDebugStore((state) => state.payload);
  const setPayload = useDebugStore((state) => state.setPayload);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">Debug JsonEditor (Zustand)</h1>
      <p className="mb-8 text-slate-600">L'éditeur est maintenant connecté à un store Zustand.</p>
      
      <div className="w-[800px] h-[500px] bg-white p-4 shadow-xl rounded-xl border border-slate-200">
        <JsonEditor
          value={payload}
          onChange={setPayload}
        />
      </div>

      <div className="mt-8 text-sm text-slate-500">
        <p>Payload actuel (longueur: {payload.length})</p>
      </div>
      
      <button 
        onClick={() => window.location.href = '/'}
        className="mt-8 px-4 py-2 bg-slate-800 text-white rounded-md"
      >
        Retour à l'application
      </button>
    </div>
  );
}
