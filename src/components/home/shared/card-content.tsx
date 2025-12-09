interface CardContentProps {
  title: string;
  description: string;
  titleSize?: "default" | "large";
}

export function CardContent({
  title,
  description,
  titleSize = "default",
}: CardContentProps) {
  const titleClasses =
    titleSize === "large"
      ? "text-xl font-bold md:text-2xl text-black dark:text-white mb-3"
      : "text-xl font-bold text-black dark:text-white mb-3";

  return (
    <>
      <h3 className={titleClasses}>{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
        {description}
      </p>
    </>
  );
}
