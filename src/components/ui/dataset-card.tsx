"use client";

import { Link } from "react-aria-components";
import { getTemplateIcon } from "@/lib/category-icons";
import { DatasetStatsRow, type DatasetStat } from "@/components/ui/dataset-stats-row";

export interface DatasetCardProps {
  name: string;
  city: string;
  country: string;
  /** Category slug (icon fallback when the template has no icon) */
  category: string;
  /** Template slug for the template-specific icon */
  templateId?: string;
  href: string;
  stats: DatasetStat[];
}

/**
 * Get country flag emoji from country code
 */
function getCountryFlag(country: string): string {
  if (!country) return "🌐";
  // ISO 3166-1 alpha-2 code → Unicode regional indicator pair
  if (/^[a-zA-Z]{2}$/.test(country)) {
    return [...country.toUpperCase()]
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join("");
  }
  // Fallback: full country name map (used by Storybook stories)
  const flagMap: Record<string, string> = {
    france: "🇫🇷",
    germany: "🇩🇪",
    japan: "🇯🇵",
    "united kingdom": "🇬🇧",
    portugal: "🇵🇹",
    netherlands: "🇳🇱",
    brazil: "🇧🇷",
    "united states": "🇺🇸",
    nigeria: "🇳🇬",
    colombia: "🇨🇴",
    ghana: "🇬🇭",
    indonesia: "🇮🇩",
    uganda: "🇺🇬",
    india: "🇮🇳",
    egypt: "🇪🇬",
  };
  return flagMap[country.toLowerCase()] ?? "🌐";
}

export function DatasetCard({
  name,
  city,
  country,
  category,
  templateId,
  href,
  stats,
}: DatasetCardProps) {
  const flag = getCountryFlag(country);
  const categoryIcon = getTemplateIcon(templateId ?? "", category);

  return (
    <Link
      href={href}
      aria-label={`${name} dataset in ${city}`}
      className="flex items-center gap-5 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-green-600 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      {/* Icon */}
      <div className="flex items-center justify-center shrink-0 w-16 h-16 text-olive-600 opacity-60 scale-[2]">
        {categoryIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{name}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{flag} <span className="ml-1">{city}</span></p>
        </div>

        <DatasetStatsRow stats={stats} className="mt-2" />
      </div>
    </Link>
  );
}
