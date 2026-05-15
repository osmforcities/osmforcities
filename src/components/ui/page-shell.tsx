import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  placement?: "top" | "center";
  className?: string;
  children: ReactNode;
}

export function PageShell({
  placement = "top",
  className,
  children,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gray-50",
        placement === "top" && "px-4 py-8",
        placement === "center" && "flex items-center justify-center",
        className
      )}
    >
      {children}
    </div>
  );
}
