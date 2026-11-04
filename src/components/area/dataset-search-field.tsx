"use client";

import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Button, Input, Label, SearchField } from "react-aria-components";

type DatasetSearchFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function DatasetSearchField({ label, value, onChange }: DatasetSearchFieldProps) {
  const t = useTranslations("AreaPage");

  return (
    <SearchField value={value} onChange={onChange} className="group relative flex items-center">
      <Label className="sr-only">{label}</Label>
      <Search className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400" aria-hidden />
      <Input
        placeholder={label}
        className="min-h-12 w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-12 text-base text-gray-900 placeholder:text-gray-500 focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500 [&::-webkit-search-cancel-button]:hidden"
      />
      <Button
        aria-label={t("clearSearch")}
        className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-olive-500 group-data-[empty]:hidden"
      >
        <X className="h-5 w-5" aria-hidden />
      </Button>
    </SearchField>
  );
}
