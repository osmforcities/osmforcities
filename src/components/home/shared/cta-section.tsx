import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";

type HeadingLevel = "h2" | "h2-xl";

interface CTASectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  buttonVariant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "link";
  centered?: boolean;
  headingLevel?: HeadingLevel;
}

export function CTASection({
  title,
  description,
  buttonText,
  buttonHref,
  buttonVariant = "default",
  centered = true,
  headingLevel = "h2"
}: CTASectionProps) {
  return (
    <div className={`${centered ? 'text-center' : ''} border border-gray-200 dark:border-gray-800 p-8 md:p-12 lg:p-16 rounded-lg`}>
      <div className={`${centered ? 'max-w-lg mx-auto' : ''}`}>
        <Heading as="h2" level={headingLevel}>
          {title}
        </Heading>
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