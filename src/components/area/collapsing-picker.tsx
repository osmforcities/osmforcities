"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";

type PickerEntry = {
  key: string;
  href: string;
  label: string;
  count: number;
  isActive: boolean;
};

type CollapsingPickerProps = {
  heading: string;
  pickedHeading: string;
  headingId: string;
  entries: PickerEntry[];
  clearHref: string;
};

export function CollapsingPicker({
  heading,
  pickedHeading,
  headingId,
  entries,
  clearHref,
}: CollapsingPickerProps) {
  const t = useTranslations("AreaPage");
  const picked = entries.find((entry) => entry.isActive);

  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {picked ? pickedHeading : heading}
      </h2>
      {picked ? (
        <Link
          href={clearHref}
          scroll={false}
          aria-label={t("clearPick", { name: picked.label })}
          className="flex min-h-12 items-center gap-3 self-start rounded-lg border border-olive-700 bg-olive-50 py-3 pl-4 pr-3 ring-1 ring-olive-700 transition-colors hover:bg-olive-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500"
        >
          <span className="text-base font-semibold text-gray-900">{picked.label}</span>
          <span className="text-sm text-gray-500">{picked.count}</span>
          <X className="h-4 w-4 text-gray-700" aria-hidden />
        </Link>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {entries.map(({ key, href, label, count }) => (
            <li key={key}>
              <Link
                href={href}
                scroll={false}
                className="flex h-full min-h-12 items-baseline justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 transition-colors hover:border-olive-300 hover:bg-olive-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500 sm:px-4"
              >
                <span className="text-sm font-semibold text-gray-900 sm:text-base">{label}</span>
                <span className="text-sm text-gray-500">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
