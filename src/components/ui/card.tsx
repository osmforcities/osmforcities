import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({
  children,
  className,
  title,
  description,
  href,
  onClick,
  hoverable = true,
}: CardProps) {
  const baseClasses =
    "bg-gray-50 border border-gray-200 rounded-lg p-6 h-full flex flex-col";
  const hoverClasses = hoverable
    ? "hover:border-olive-300 hover:bg-olive-50 transition-all duration-200 group-hover:shadow-md"
    : "";

  const cardContent = (
    <div
      className={cn(baseClasses, hoverClasses, className)}
      title={description || undefined}
    >
      {children}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block h-full">
        {cardContent}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="block h-full w-full text-left"
        aria-label={title}
      >
        {cardContent}
      </button>
    );
  }

  return cardContent;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("flex-1", className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return <div className={cn("mt-auto", className)}>{children}</div>;
}
