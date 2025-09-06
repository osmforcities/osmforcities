"use client";

import { Button as ReactAriaButton, type ButtonProps } from "react-aria-components";
import { cn } from "@/lib/utils";

interface AriaButtonProps extends ButtonProps {
  variant?: "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
}

const buttonVariants = {
  variant: {
    default: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
    secondary: "bg-white border border-olive-200 text-olive-700 hover:bg-olive-50 hover:text-olive-600 focus:ring-blue-500",
    ghost: "text-olive-700 hover:text-olive-600 hover:bg-olive-100 focus:ring-blue-500"
  },
  size: {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base"
  }
};

export default function NavButton({ 
  className, 
  variant = "default", 
  size = "default", 
  children, 
  ...props 
}: AriaButtonProps) {
  return (
    <ReactAriaButton
      className={cn(
        "font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        className
      )}
      {...props}
    >
      {children}
    </ReactAriaButton>
  );
}