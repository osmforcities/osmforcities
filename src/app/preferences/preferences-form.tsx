"use client";

import { useState } from "react";

type PreferencesFormProps = {
  initialReportsEnabled: boolean;
  initialReportsFrequency: "DAILY" | "WEEKLY";
};

export function PreferencesForm({
  initialReportsEnabled,
  initialReportsFrequency,
}: PreferencesFormProps) {
  const [reportsEnabled, setReportsEnabled] = useState(initialReportsEnabled);
  const [reportsFrequency, setReportsFrequency] = useState(
    initialReportsFrequency
  );
  const [saving, setSaving] = useState(false);

  const updatePreference = async (
    enabled: boolean,
    frequency?: "DAILY" | "WEEKLY"
  ) => {
    setSaving(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportsEnabled: enabled,
          reportsFrequency: frequency || reportsFrequency,
        }),
      });

      if (response.ok) {
        setReportsEnabled(enabled);
        if (frequency) setReportsFrequency(frequency);
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
            updatePreference(e.target.checked);
          }}
          className="mr-2"
        />
        Enable reports
      </label>

      {reportsEnabled && (
        <div className="ml-6">
          <label className="block text-sm font-medium mb-2">Frequency:</label>
          <select
            value={reportsFrequency}
            onChange={(e) => {
              updatePreference(true, e.target.value as "DAILY" | "WEEKLY");
            }}
            className="border rounded px-3 py-2"
            disabled={saving}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>
      )}
    </div>
  );
}
