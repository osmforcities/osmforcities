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
        <h2 className="mb-5 text-4xl font-bold md:mb-6 md:text-5xl lg:text-6xl text-black dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
