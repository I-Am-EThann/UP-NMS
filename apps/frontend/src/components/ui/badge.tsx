import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-900",
        outline: "border border-border-strong text-ink-600",
        normal: "bg-sev-normal-bg text-sev-normal",
        warning: "bg-sev-warning-bg text-sev-warning",
        major: "bg-sev-major-bg text-sev-major",
        critical: "bg-sev-critical-bg text-sev-critical",
        offline: "bg-sev-offline-bg text-sev-offline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
