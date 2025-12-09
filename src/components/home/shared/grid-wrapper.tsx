import { ReactNode } from "react";

interface GridWrapperProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function GridWrapper({
  children,
  columns = 2,
  maxWidth = "lg",
  gap = "md",
  className = ""
}: GridWrapperProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "xl:grid-cols-4"
  };

  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-7xl",
    xl: "max-w-full",
    full: ""
  };

  const gapClasses = {
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8"
  };

  return (
    <div className={`grid grid-cols-1 ${columnClasses[columns]} ${gapClasses[gap]} ${maxWidthClasses[maxWidth]} mx-auto ${className}`}>
      {children}
    </div>
  );
}