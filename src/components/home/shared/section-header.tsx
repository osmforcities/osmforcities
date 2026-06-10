import { Heading } from "@/components/ui/heading";

interface SectionHeaderProps {
  subtitle?: string;
  title: string;
  description?: string;
}

export function SectionHeader({
  subtitle,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="mb-12 md:mb-16">
      <div className="mx-auto max-w-2xl text-center">
        {subtitle && (
          <p className="mb-3 font-semibold text-gray-600 dark:text-gray-400 md:mb-4">
            {subtitle}
          </p>
        )}
        <Heading as="h2" level="h2">
          {title}
        </Heading>
        {description && (
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
