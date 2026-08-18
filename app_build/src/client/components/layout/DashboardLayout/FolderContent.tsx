import { FolderDashed } from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { ApiRequest } from "../../../../shared/lib/parser";
import { useStore } from "../../../store/useStore";
import { MethodBadge } from "../../ui/method-badge";

interface FolderContentProps {
  selectedFolderName: string;
  requestsInSelectedFolder: ApiRequest[];
}

export function FolderContent({
  selectedFolderName,
  requestsInSelectedFolder,
}: FolderContentProps) {
  const { selectedRequestId, setSelectedRequestId } = useStore();

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

  return (
    <div className="flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm min-h-[500px] md:h-full">
      <div className="bg-muted/50 p-3 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider truncate">
          Requêtes : {selectedFolderName}
        </h2>
      </div>
      <div ref={scrollParentRef} className="flex-1 overflow-y-auto p-0 bg-card">
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
                // biome-ignore lint/a11y/useSemanticElements: Tailwind styling constraints require div with role button
                <div
                  role="button"
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
  );
}
