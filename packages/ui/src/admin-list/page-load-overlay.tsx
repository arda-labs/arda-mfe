import { Loader2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

type PageLoadOverlayProps = {
  className?: string;
};

export function PageLoadOverlay({ className }: PageLoadOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[1px]",
        className,
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-background px-6 py-5 shadow-sm">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    </div>
  );
}
