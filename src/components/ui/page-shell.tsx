import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  placement?: "top" | "center";
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}

export function PageShell({
  placement = "top",
  className,
  children,
  "data-testid": testId,
}: PageShellProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        // The nav sits above every page, so a full-height page is the viewport
        // minus the nav. min-h-screen overflows by exactly the nav's height,
        // which puts a scrollbar on every page and drops centred content low.
        "min-h-[calc(100vh-var(--nav-height))] bg-gray-50",
        placement === "top" && "px-4 py-8",
        placement === "center" && "flex items-center justify-center",
        className
      )}
    >
      {children}
    </div>
  );
}
