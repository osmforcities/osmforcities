import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  variant?: "basic" | "underline";
  size?: "sm" | "base" | "lg";
  className?: string;
}

const linkVariants = {
  basic: "text-link hover:text-link-active hover:underline transition-colors",
  underline: "text-link underline hover:text-link-active transition-colors",
};

const linkSizes = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

export function Link({
  href,
  children,
  external = false,
  variant = "basic",
  size = "base",
  className,
}: LinkProps) {
  const isExternal = external || href.startsWith("http");
  const variantClasses = linkVariants[variant];
  const sizeClasses = linkSizes[size];

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center gap-1",
        variantClasses,
        sizeClasses,
        className
      )}
    >
      {children}
      {isExternal && <ExternalLink className="w-3 h-3" />}
    </a>
  );
}
