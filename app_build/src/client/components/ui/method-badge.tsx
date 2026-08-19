import { cn } from "../../lib/utils";

interface MethodBadgeProps {
  method: string;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  const normalizedMethod = method?.toUpperCase() || "GET";

  let colorClass = "bg-slate-500/10 text-slate-600 dark:text-slate-400";

  switch (normalizedMethod) {
    case "GET":
      colorClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      break;
    case "POST":
      colorClass = "bg-blue-500/15 text-blue-700 dark:text-blue-400";
      break;
    case "PUT":
      colorClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400";
      break;
    case "PATCH":
      colorClass = "bg-purple-500/15 text-purple-700 dark:text-purple-400";
      break;
    case "DELETE":
      colorClass = "bg-rose-500/15 text-rose-700 dark:text-rose-400";
      break;
  }

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold tracking-widest w-16 text-center shrink-0 uppercase",
        colorClass,
        className,
      )}
    >
      {normalizedMethod}
    </span>
  );
}
