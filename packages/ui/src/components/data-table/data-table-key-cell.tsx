"use client";

import { cn } from "@workspace/ui/lib/utils";

type DataTableKeyCellProps = {
  children: React.ReactNode;
  onActivate: () => void;
  className?: string;
};

export function DataTableKeyCell({
  children,
  onActivate,
  className,
}: DataTableKeyCellProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      className={cn(
        "max-w-full truncate text-left font-medium text-foreground",
        "hover:text-primary hover:underline underline-offset-2",
        "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
}
