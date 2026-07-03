import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

const statusVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 font-medium text-xs transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-muted text-muted-foreground **:data-[slot=status-indicator]:bg-muted-foreground",
        success:
          "border-success/20 bg-success/10 text-success **:data-[slot=status-indicator]:bg-success",
        error:
          "border-destructive/20 bg-destructive/10 text-destructive **:data-[slot=status-indicator]:bg-destructive",
        warning:
          "border-warning/25 bg-warning/15 text-warning **:data-[slot=status-indicator]:bg-warning",
        info:
          "border-info/20 bg-info/10 text-info **:data-[slot=status-indicator]:bg-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface StatusProps
  extends VariantProps<typeof statusVariants>,
    React.ComponentProps<"div"> {
  asChild?: boolean;
}

function Status(props: StatusProps) {
  const { className, variant = "default", asChild, ...rootProps } = props;

  const RootPrimitive = asChild ? SlotPrimitive.Slot : "div";

  return (
    <RootPrimitive
      data-slot="status"
      data-variant={variant}
      {...rootProps}
      className={cn(statusVariants({ variant }), className)}
    />
  );
}

function StatusIndicator(props: React.ComponentProps<"div">) {
  const { className, ...indicatorProps } = props;

  return (
    <div
      data-slot="status-indicator"
      {...indicatorProps}
      className={cn(
        "relative flex size-2 shrink-0 rounded-full",
        "before:absolute before:inset-0 before:rounded-full before:bg-inherit before:opacity-25",
        "after:absolute after:inset-[2px] after:rounded-full after:bg-inherit",
        className,
      )}
    />
  );
}

function StatusLabel(props: React.ComponentProps<"div">) {
  const { className, ...labelProps } = props;

  return (
    <div
      data-slot="status-label"
      {...labelProps}
      className={cn("leading-none", className)}
    />
  );
}

export { Status, StatusIndicator, StatusLabel, statusVariants };
