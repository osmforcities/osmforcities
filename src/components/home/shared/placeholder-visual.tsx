interface PlaceholderVisualProps {
  className?: string;
  aspectRatio?: "square" | "video";
}

export function PlaceholderVisual({
  className = "",
  aspectRatio = "square",
}: PlaceholderVisualProps) {
  const aspectClasses =
    aspectRatio === "square" ? "aspect-square" : "aspect-video";

  return (
    <div
      className={`flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-8 ${className}`}
    >
      <div
        className={`w-full ${aspectClasses} max-w-md flex items-center justify-center text-gray-400 dark:text-gray-600`}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="400" height="400" fill="currentColor" opacity="0.1" />
          <path
            d="M200 100 L300 200 L200 300 L100 200 Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
}
