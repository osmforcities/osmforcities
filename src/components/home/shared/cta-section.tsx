import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  buttonVariant?: "default" | "outline";
  centered?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function CTASection({
  title,
  description,
  buttonText,
  buttonHref,
  buttonVariant = "default",
  centered = true,
  size = "md"
}: CTASectionProps) {
  const sizeClasses = {
    sm: "text-3xl md:text-4xl",
    md: "text-4xl md:text-5xl",
    lg: "text-5xl md:text-7xl",
    xl: "text-5xl md:text-7xl lg:text-8xl"
  };

  return (
    <div className={`${centered ? 'text-center' : ''} border border-gray-200 dark:border-gray-800 p-8 md:p-12 lg:p-16 rounded-lg`}>
      <div className={`${centered ? 'max-w-lg mx-auto' : ''}`}>
        <h2 className={`mb-5 font-bold md:mb-6 ${sizeClasses[size]} text-black dark:text-white`}>
          {title}
        </h2>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6 md:mb-8">
          {description}
        </p>
        <Button size="lg" variant={buttonVariant} asChild className="w-full sm:w-auto">
          <Link href={buttonHref}>{buttonText}</Link>
        </Button>
      </div>
    </div>
  );
}