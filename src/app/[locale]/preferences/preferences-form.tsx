"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Locale } from "@/i18n/routing";
import { AVAILABLE_LOCALES, LOCALE_DISPLAY_NAMES } from "@/i18n/constants";
import type { ReportFrequency } from "@prisma/client";

// Sends only the fields the caller owns; the API leaves the rest untouched.
const savePreferences = (
  body: Partial<{
    reportsEnabled: boolean;
    reportsFrequency: ReportFrequency;
    language: string;
  }>
) =>
  fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

type ReportsFormProps = {
  initialReportsEnabled: boolean;
  initialReportsFrequency: ReportFrequency;
};

export function ReportsForm({
  initialReportsEnabled,
  initialReportsFrequency,
}: ReportsFormProps) {
  const t = useTranslations("PreferencesForm");
  const [reportsEnabled, setReportsEnabled] = useState(initialReportsEnabled);
  const [reportsFrequency, setReportsFrequency] = useState(
    initialReportsFrequency
  );
  const [saving, setSaving] = useState(false);

  const updateReports = async (
    enabled: boolean,
    frequency: ReportFrequency
  ) => {
    setSaving(true);
    try {
      const response = await savePreferences({
        reportsEnabled: enabled,
        reportsFrequency: frequency,
      });
      if (response.ok) {
        setReportsEnabled(enabled);
        setReportsFrequency(frequency);
      }
    } catch (error) {
      console.error("Error updating preference:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={reportsEnabled}
          onChange={(e) => {
            updateReports(e.target.checked, reportsFrequency);
          }}
          className="mr-2"
          disabled={saving}
        />
        {t("enableReports")}
      </label>

      {reportsEnabled && (
        <div className="ml-6">
          <label
            htmlFor="reports-frequency-select"
            className="block text-sm font-medium mb-2"
          >
            {t("frequency")}
          </label>
          <select
            id="reports-frequency-select"
            value={reportsFrequency}
            onChange={(e) => {
              updateReports(true, e.target.value as ReportFrequency);
            }}
            className="border rounded px-3 py-2"
            disabled={saving}
          >
            <option value="DAILY">{t("daily")}</option>
            <option value="WEEKLY">{t("weekly")}</option>
          </select>
        </div>
      )}
    </div>
  );
}

export function LanguageForm({ initialLanguage }: { initialLanguage: string }) {
  const t = useTranslations("PreferencesForm");
  const router = useRouter();
  const pathname = usePathname();
  const [language, setLanguage] = useState(initialLanguage);
  const [saving, setSaving] = useState(false);

  const updateLanguage = async (lang: string) => {
    setSaving(true);
    try {
      const response = await savePreferences({ language: lang });
      if (response.ok) {
        setLanguage(lang);
        router.push(pathname, { locale: lang as Locale });
      }
    } catch (error) {
      console.error("Error updating preference:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label htmlFor="language-select" className="sr-only">
        {t("language")}
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => {
          updateLanguage(e.target.value);
        }}
        className="border rounded px-3 py-2"
        disabled={saving}
      >
        {AVAILABLE_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_DISPLAY_NAMES[locale as keyof typeof LOCALE_DISPLAY_NAMES]}
          </option>
        ))}
      </select>
    </div>
  );
}
