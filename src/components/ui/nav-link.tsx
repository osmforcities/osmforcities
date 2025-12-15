"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isMobile?: boolean;
  variant?: "default" | "primary" | "destructive";
  "data-testid"?: string;
}

const navLinkVariants = {
  default: "text-gray-700 hover:text-gray-900 hover:bg-olive-100",
  primary: "bg-olive-500 text-white hover:bg-olive-600",
  destructive:
    "text-gray-700 hover:text-gray-900 hover:bg-red-100 hover:text-red-700",
};

const navLinkSizes = {
  mobile:
    "w-full px-4 py-4 text-left font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-inset rounded",
  desktop:
    "px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 rounded",
};

export function NavLink({
  href,
  children,
  isMobile = false,
  variant = "default",
  "data-testid": dataTestId,
}: NavLinkProps) {
  const baseClasses = isMobile ? navLinkSizes.mobile : navLinkSizes.desktop;
  const variantClasses = navLinkVariants[variant];

  return (
    <Link href={href} className={cn(baseClasses, variantClasses)} data-testid={dataTestId}>
      {children}
    </Link>
  );
}

interface NavButtonProps {
  children: React.ReactNode;
  isMobile?: boolean;
  variant?: "default" | "primary" | "destructive";
  onClick?: () => void;
  type?: "button" | "submit";
}

export function NavButton({
  children,
  isMobile = false,
  variant = "default",
  onClick,
  type = "button",
}: NavButtonProps) {
  const baseClasses = isMobile ? navLinkSizes.mobile : navLinkSizes.desktop;
  const variantClasses = navLinkVariants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(baseClasses, variantClasses, "cursor-pointer")}
    >
      {children}
    </button>
  );
}
