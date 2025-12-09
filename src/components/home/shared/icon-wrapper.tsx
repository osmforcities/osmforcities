import { LucideIcon } from "lucide-react";

interface IconWrapperProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "featured";
  className?: string;
}

export function IconWrapper({
  icon: Icon,
  size = "md",
  variant = "default",
  className = ""
}: IconWrapperProps) {
  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4"
  };

  const iconSizes = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8"
  };

  const variantClasses = variant === "featured"
    ? "bg-blue-100 dark:bg-blue-900 border-2 border-blue-600 shadow-lg"
    : "bg-blue-50 dark:bg-blue-950";

  return (
    <div className={`${variantClasses} rounded-lg ${sizeClasses[size]} transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-900 ${className}`}>
      <Icon className={`${iconSizes[size]} text-blue-600`} />
    </div>
  );
}