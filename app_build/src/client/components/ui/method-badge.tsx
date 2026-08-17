import React from "react";
import { cn } from "../../lib/utils";

interface MethodBadgeProps {
  method: string;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  const normalizedMethod = method?.toUpperCase() || "GET";

  let colorClass =
    "bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";

  switch (normalizedMethod) {
    case "GET":
      colorClass =
        "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
      break;
    case "POST":
      colorClass =
        "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800";
      break;
    case "PUT":
      colorClass =
        "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800";
      break;
    case "PATCH":
      colorClass =
        "bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-800";
      break;
    case "DELETE":
      colorClass =
        "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800";
      break;
  }

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border w-14 text-center shrink-0",
        colorClass,
        className,
      )}
    >
      {normalizedMethod}
    </span>
  );
}
