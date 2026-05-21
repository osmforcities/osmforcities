import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  className?: string;
  children: ReactNode;
}

export function InfoCard({ className, children }: InfoCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm p-8",
        className
      )}
    >
      {children}
    </div>
  );
}
