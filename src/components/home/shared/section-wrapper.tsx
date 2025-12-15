import { ReactNode } from "react";

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  dataSection?: string;
}

export function SectionWrapper({
  children,
  className = "",
  dataSection,
}: SectionWrapperProps) {
  return (
    <section
      className={`px-4 py-16 md:py-24 lg:py-28 ${className}`}
      data-section={dataSection}
    >
      <div className="container mx-auto">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  subtitle?: string;
  title: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({
  subtitle,
  title,
  description,
  centered = true,
  className = ""
}: SectionHeaderProps) {
  const wrapperClasses = centered
    ? "mx-auto max-w-2xl text-center"
    : "";

  return (
    <div className={`mb-12 md:mb-16 ${className}`}>
      <div className={wrapperClasses}>
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
