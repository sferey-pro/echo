import { Star } from "@phosphor-icons/react";
import { Input } from "../../ui/input";
import type { ApiRequest } from "../../../../shared/lib/parser";
import { MethodBadge } from "../../ui/method-badge";

interface RequestHeaderProps {
  request: ApiRequest;
  isStarred: boolean;
  onToggleStar: () => void;
  urlParams: { variables: string[]; pathParams: string[] };
  pathParamsOverrides: Record<string, string>;
  onPathParamChange: (param: string, value: string) => void;
  onPathParamBlur: () => void;
}

export function RequestHeader({
  request,
  isStarred,
  onToggleStar,
  urlParams,
  pathParamsOverrides,
  onPathParamChange,
  onPathParamBlur,
}: RequestHeaderProps) {
  return (
    <div className="p-4 bg-card border-b border-border z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
      <div className="w-full xl:flex-1">
        <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
          <button
            onClick={onToggleStar}
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-9 hover:scale-110 transition-transform bg-transparent hover:bg-transparent ${
              isStarred
                ? "text-yellow-400 hover:text-yellow-500 drop-shadow-sm"
                : "text-slate-400 hover:text-slate-500"
            }`}
            title={isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Star weight={isStarred ? "fill" : "regular"} className="w-6 h-6" />
          </button>
          <span className="truncate">{request.name}</span>
        </h2>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2">
            <MethodBadge method={request.method} />
            <p className="text-sm text-foreground font-bold truncate max-w-full">
              {request.url}
            </p>
          </div>

          {urlParams.pathParams.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1 items-center">
              <span className="text-xs font-black uppercase mr-1">
                URL Params:
              </span>
              {urlParams.pathParams.map((param) => (
                <div
                  key={param}
                  className="flex items-center overflow-hidden h-8 border border-border rounded-md bg-background focus-within:ring-1 focus-within:ring-primary/50"
                >
                  <span className="text-xs font-bold px-2 py-1 bg-muted border-r border-border h-full flex items-center">
                    :{param}
                  </span>
                  <Input
                    className="h-full border-none shadow-none rounded-none text-xs font-bold px-2 w-24 focus-visible:ring-0 bg-transparent"
                    placeholder="Default"
                    value={pathParamsOverrides[param] || ""}
                    onChange={(e) => onPathParamChange(param, e.target.value)}
                    onBlur={onPathParamBlur}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
