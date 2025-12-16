import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const headingVariants = cva(
  "font-bold text-black dark:text-white",
  {
    variants: {
      level: {
        h1: "text-5xl md:text-6xl lg:text-7xl",
        h2: "text-4xl md:text-5xl lg:text-6xl",
        "h2-xl": "text-5xl md:text-7xl lg:text-8xl",
        h3: "text-xl md:text-2xl",
        "h3-compact": "text-lg md:text-xl",
        h4: "text-lg md:text-xl",
        h5: "text-base md:text-lg",
        h6: "text-sm md:text-base",
      },
      spacing: {
        default: "mb-5 md:mb-6",
        none: "",
        sm: "mb-3 md:mb-4",
        lg: "mb-6 md:mb-8",
      },
    },
    defaultVariants: {
      level: "h2",
      spacing: "default",
    },
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function Heading({
  as,
  level,
  spacing,
  className,
  children,
  ...props
}: HeadingProps) {
  const Component = as || (level?.startsWith("h") ? (level.replace("-xl", "").replace("-compact", "") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6") : "h2");

  return (
    <Component
      className={cn(headingVariants({ level, spacing }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}
