import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  overflowHidden?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

export function Card({
  children,
  className = "",
  overflowHidden = false,
  padding = "md",
}: CardProps) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    none: "",
  };

  return (
    <div
      className={cn(
        "flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl",
        overflowHidden && "overflow-hidden",
        paddingClasses[padding],
        "hover:shadow-lg transition-shadow duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}
