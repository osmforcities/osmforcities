"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
};

type TemplateSelectorProps = {
  templates: Template[];
  selectedTemplate: string;
  onTemplateSelected: (templateId: string) => void;
};

export default function TemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelected,
}: TemplateSelectorProps) {
  const t = useTranslations("TemplateSelector");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  // Filter templates based on search term
  const filteredTemplates = searchTerm
    ? templates.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (template.description &&
            template.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          template.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : templates;

  // Group filtered templates by category
  const filteredGroupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const handleCategoryClick = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handleTemplateClick = (templateId: string) => {
    onTemplateSelected(templateId);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full p-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
          >
            {t("close")}
          </button>
        )}
      </div>

      {searchTerm && filteredTemplates.length === 0 && (
        <p className="text-gray-500 text-sm">
          {t("noTemplatesFound")}{searchTerm}{t("quote")}
        </p>
      )}

      <div className="border border-gray-200 rounded-md overflow-hidden">
        {Object.entries(
          searchTerm ? filteredGroupedTemplates : groupedTemplates
        ).map(([category, categoryTemplates]) => (
          <div
            key={category}
            className="border-b border-gray-200 last:border-b-0"
          >
            <div
              className="p-3 bg-gray-50 font-medium cursor-pointer flex justify-between items-center"
              onClick={() => handleCategoryClick(category)}
            >
              <span className="capitalize">{category}</span>
              <span>{expandedCategory === category ? "−" : "+"}</span>
            </div>
            {(expandedCategory === category || searchTerm) && (
              <ul className="divide-y divide-gray-200">
                {categoryTemplates.map((template) => (
                  <li
                    key={template.id}
                    className={`p-3 hover:bg-gray-50 cursor-pointer ${
                      selectedTemplate === template.id
                        ? "bg-black text-white hover:bg-gray-800"
                        : ""
                    }`}
                    onClick={() => handleTemplateClick(template.id)}
                  >
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p
                            className={`text-sm ${
                              selectedTemplate === template.id
                                ? "text-gray-200"
                                : "text-gray-600"
                            }`}
                          >
                            {template.description}
                          </p>
                        )}
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="ml-2">{t("selected")}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Selected template details */}
      {selectedTemplate && (
        <div className="mt-4 p-3 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="font-medium">{t("selectedTemplate")}</h3>
          <p>{templates.find((t) => t.id === selectedTemplate)?.name || ""}</p>
          <p className="text-sm text-gray-600 mt-1">
            {templates.find((t) => t.id === selectedTemplate)?.description ||
              ""}
          </p>
        </div>
      )}
    </div>
  );
}
