"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Locale } from "@/i18n/routing";

type PreferencesFormProps = {
  initialReportsEnabled: boolean;
  initialReportsFrequency: "DAILY" | "WEEKLY";
  initialLanguage: string;
};

export function PreferencesForm({
  initialReportsEnabled,
  initialReportsFrequency,
  initialLanguage,
}: PreferencesFormProps) {
  const t = useTranslations("PreferencesForm");
  const router = useRouter();
  const pathname = usePathname();
  const [reportsEnabled, setReportsEnabled] = useState(initialReportsEnabled);
  const [reportsFrequency, setReportsFrequency] = useState(
    initialReportsFrequency
  );
  const [language, setLanguage] = useState(initialLanguage);
  const [saving, setSaving] = useState(false);

  const updatePreference = async (
    enabled: boolean,
    frequency?: "DAILY" | "WEEKLY",
    lang?: string
  ) => {
    setSaving(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportsEnabled: enabled,
          reportsFrequency: frequency || reportsFrequency,
          language: lang || language,
        }),
      });

      if (response.ok) {
        setReportsEnabled(enabled);
        if (frequency) setReportsFrequency(frequency);
        if (lang) {
          setLanguage(lang);
          // Set language preference cookie for immediate effect
          document.cookie = `language-preference=${lang}; path=/; max-age=${
            60 * 60 * 24 * 365
          }`; // 1 year
          router.push(pathname, { locale: lang as Locale });
        }
      }
    } catch (error) {
      console.error("Error updating preference:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={reportsEnabled}
            onChange={(e) => {
              updatePreference(e.target.checked);
            }}
            className="mr-2"
          />
          {t("enableReports")}
        </label>

        {reportsEnabled && (
          <div className="ml-6">
            <label className="block text-sm font-medium mb-2">
              {t("frequency")}
            </label>
            <select
              value={reportsFrequency}
              onChange={(e) => {
                updatePreference(true, e.target.value as "DAILY" | "WEEKLY");
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
      <div>
        <label className="block text-sm font-medium mb-2">
          {t("language")}
        </label>
        <select
          value={language}
          onChange={(e) => {
            updatePreference(reportsEnabled, reportsFrequency, e.target.value);
          }}
          className="border rounded px-3 py-2"
          disabled={saving}
        >
          <option value="en">{t("en")}</option>
          <option value="pt-BR">{t("pt-BR")}</option>
        </select>
      </div>
    </div>
  );
}
