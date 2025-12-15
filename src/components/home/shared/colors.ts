export type ColorVariant =
  | "olive"
  | "green"
  | "blue"
  | "indigo-gray"
  | "yellow"
  | "orange"
  | "purple"
  | "pink";

export const DEFAULT_COLORS = {
  bg: "bg-gray-50 dark:bg-gray-950",
  bgHover: "group-hover:bg-gray-100 dark:group-hover:bg-gray-900",
  icon: "text-blue-600",
} as const;

// All classes written in full for Tailwind static analysis
export function getColorClasses(color: ColorVariant) {
  switch (color) {
    case "olive":
      return {
        bg: "bg-olive-100 dark:bg-olive-700",
        bgHover: "group-hover:bg-olive-200 dark:group-hover:bg-olive-600",
        icon: "text-olive-500",
      };
    case "green":
      return {
        bg: "bg-green-100 dark:bg-green-700",
        bgHover: "group-hover:bg-green-200 dark:group-hover:bg-green-600",
        icon: "text-green-500",
      };
    case "blue":
      return {
        bg: "bg-blue-100 dark:bg-blue-700",
        bgHover: "group-hover:bg-blue-200 dark:group-hover:bg-blue-600",
        icon: "text-blue-500",
      };
    case "indigo-gray":
      return {
        bg: "bg-indigo-gray-100 dark:bg-indigo-gray-700",
        bgHover:
          "group-hover:bg-indigo-gray-200 dark:group-hover:bg-indigo-gray-600",
        icon: "text-indigo-gray-500",
      };
    case "yellow":
      return {
        bg: "bg-yellow-100 dark:bg-yellow-700",
        bgHover: "group-hover:bg-yellow-200 dark:group-hover:bg-yellow-600",
        icon: "text-yellow-500",
      };
    case "orange":
      return {
        bg: "bg-orange-100 dark:bg-orange-700",
        bgHover: "group-hover:bg-orange-200 dark:group-hover:bg-orange-600",
        icon: "text-orange-500",
      };
    case "purple":
      return {
        bg: "bg-purple-100 dark:bg-purple-700",
        bgHover: "group-hover:bg-purple-200 dark:group-hover:bg-purple-600",
        icon: "text-purple-500",
      };
    case "pink":
      return {
        bg: "bg-pink-100 dark:bg-pink-700",
        bgHover: "group-hover:bg-pink-200 dark:group-hover:bg-pink-600",
        icon: "text-pink-500",
      };
  }
}

export const useCaseColors: ColorVariant[] = [
  "blue",
  "orange",
  "pink",
  "indigo-gray",
  "green",
  "pink",
  "yellow",
  "blue",
];

export const categoryColors: ColorVariant[] = [
  "blue",
  "orange",
  "purple",
  "pink",
  "indigo-gray",
  "green",
  "yellow",
  "blue",
  "purple",
];
