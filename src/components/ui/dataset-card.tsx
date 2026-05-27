"use client";

import { Link } from "react-aria-components";
import { MapPin, Users, Pencil } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";

export interface DatasetCardProps {
  name: string;
  city: string;
  country: string;
  category: string;
  href: string;
  stats: Array<{ label: string; value: string | number }>;
}

/**
 * Get country flag emoji from country code
 */
function getCountryFlag(country: string): string {
  if (!country) return "";
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
  return flagMap[country.toLowerCase()] ?? "";
}

/**
 * Format number in compact notation (1.2k, 2M, etc.)
 */
function formatCompactNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : value;
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Format stat value based on label type
 */
function formatStatValue(label: string, value: string | number): string {
  const lowerLabel = label.toLowerCase();
  const strValue = String(value);

  // Format dates: "2 days ago" → "2d", "3 months ago" → "3mo"
  if (lowerLabel.includes("update") || lowerLabel.includes("last") || lowerLabel.includes("time")) {
    const match = strValue.toLowerCase().match(/(\d+)\s*(day|week|month|year)s?\s*ago/);
    if (match) {
      const [, num, unit] = match;
      return `${num}${unit === 'month' ? 'mo' : unit.charAt(0)}`;
    }
    return strValue;
  }

  // Format numbers for everything else
  return formatCompactNumber(value);
}

/**
 * Get icon for stat type based on label
 */
function getStatIcon(label: string) {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("contributor") || lowerLabel.includes("user") || lowerLabel.includes("people")) return Users;
  if (lowerLabel.includes("update") || lowerLabel.includes("last") || lowerLabel.includes("time")) return Pencil;
  return MapPin;
}

export function DatasetCard({
  name,
  city,
  country,
  category,
  href,
  stats,
}: DatasetCardProps) {
  const flag = getCountryFlag(country);
  const categoryIcon = getCategoryIcon(category);

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

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] mt-2">
          {stats.map((stat) => {
            const StatIcon = getStatIcon(stat.label);
            return (
              <div key={stat.label} className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                <StatIcon className="w-2.5 h-2.5" />
                <span className="font-medium">{formatStatValue(stat.label, stat.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
