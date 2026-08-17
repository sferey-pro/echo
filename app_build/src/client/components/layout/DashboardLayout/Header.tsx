import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../ui/button";
import { Gear, CloudArrowDown, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useStore } from "../../../store/useStore";

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { loadCollection } = useStore();
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

  return (
    <div className="flex-none px-4 py-3 bg-card border-b border-border flex items-center justify-between z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
          Echo
        </h1>

        <Button
          variant="secondary"
          size="icon"
          onClick={onOpenSettings}
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
                <CloudArrowDown className="w-4 h-4 opacity-50" weight="bold" />
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
  );
}
