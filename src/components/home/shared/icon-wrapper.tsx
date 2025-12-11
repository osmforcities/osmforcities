import { LucideIcon } from "lucide-react";
import { ColorVariant, getColorClasses } from "./colors";

interface IconWrapperProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "featured";
  colorVariant?: ColorVariant;
  className?: string;
}

export function IconWrapper({
  icon: Icon,
  size = "md",
  variant = "default",
  colorVariant,
  className = "",
}: IconWrapperProps) {
  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  const iconSizes = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  };

  const customColors = colorVariant ? getColorClasses(colorVariant) : null;

  const variantClasses =
    variant === "featured"
      ? "bg-blue-100 dark:bg-blue-900 border-2 border-blue-600 shadow-lg"
      : customColors
        ? `${customColors.bg} ${customColors.bgHover}`
        : "bg-blue-50 dark:bg-blue-950 group-hover:bg-blue-100 dark:group-hover:bg-blue-900";

  const iconColorClass = customColors ? customColors.icon : "text-blue-600";

  return (
    <div
      className={`${variantClasses} rounded-lg ${sizeClasses[size]} transition-colors ${className}`}
    >
      <Icon className={`${iconSizes[size]} ${iconColorClass}`} />
    </div>
  );
}
