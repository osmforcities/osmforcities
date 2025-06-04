"use client";

import { useState } from "react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
};

type CreateMonitorFormProps = {
  templates: Template[];
  userId: string;
};

export default function CreateMonitorForm({
  templates,
  userId,
}: CreateMonitorFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [cityName, setCityName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !cityName) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          cityName: cityName.trim(),
          countryCode: countryCode.trim() || null,
          isPublic,
        }),
      });

      if (response.ok) {
        // Reset form
        setSelectedTemplate("");
        setCityName("");
        setCountryCode("");
        setIsPublic(false);
        // Refresh the page to show new monitor
        window.location.reload();
      } else {
        alert("Failed to create monitor");
      }
    } catch (error) {
      console.error("Error creating monitor:", error);
      alert("Failed to create monitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="template" className="block text-sm font-medium mb-2">
          Data Template *
        </label>
        <select
          id="template"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full p-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
          required
        >
          <option value="">Select a data template...</option>
          {Object.entries(groupedTemplates).map(
            ([category, categoryTemplates]) => (
              <optgroup
                key={category}
                label={category.charAt(0).toUpperCase() + category.slice(1)}
              >
                {categoryTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
            )
          )}
        </select>
      </div>

      <div>
        <label htmlFor="cityName" className="block text-sm font-medium mb-2">
          City Name *
        </label>
        <input
          type="text"
          id="cityName"
          value={cityName}
          onChange={(e) => setCityName(e.target.value)}
          placeholder="e.g., New York, London, Tokyo"
          className="w-full p-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
      </div>

      <div>
        <label htmlFor="countryCode" className="block text-sm font-medium mb-2">
          Country Code (optional)
        </label>
        <input
          type="text"
          id="countryCode"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          placeholder="e.g., US, UK, JP"
          maxLength={2}
          className="w-full p-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-4 h-4 text-black border-black focus:ring-black"
        />
        <label htmlFor="isPublic" className="text-sm font-medium">
          Make this monitor public (others can see it)
        </label>
      </div>

      <button
        type="submit"
        disabled={!selectedTemplate || !cityName || isSubmitting}
        className="w-full bg-black text-white py-2 px-4 border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create Monitor"}
      </button>
    </form>
  );
}
