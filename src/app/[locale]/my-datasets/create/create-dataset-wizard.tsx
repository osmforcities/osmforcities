"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import AreaSelector from "./area-selector";
import TemplateSelector from "./template-selector";
import QueryTester from "./query-tester";
import { Area } from "@/types/area";
import { useTranslations } from "next-intl";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  overpassQuery: string;
  tags: string[];
};

type CreateDatasetWizardProps = {
  templates: Template[];
  userId: string;
};

export default function CreateDatasetWizard({
  templates,
}: CreateDatasetWizardProps) {
  const t = useTranslations("CreateDatasetWizard");
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!selectedArea || !selectedTemplate) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          osmRelationId: selectedArea.id,
        }),
      });

      if (response.ok) {
        router.push("/");
      } else {
        const data = await response.json();
        alert(`Failed to create dataset: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating dataset:", error);
      alert("Failed to create dataset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= step
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step}
            </div>
            <span className="text-sm font-medium">
              {
                ["Select Area", "Select Template", "Test Query", "Confirm"][
                  step - 1
                ]
              }
            </span>
            {step < 4 && (
              <div className="h-0.5 bg-gray-200 flex-grow mx-4 mt-4"></div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Area Selection */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("selectArea")}</h2>
          <p className="text-gray-600">
            {t("selectAreaDescription")}
          </p>

          <AreaSelector
            onAreaSelected={setSelectedArea}
            selectedArea={selectedArea}
          />

          <div className="flex justify-end mt-6">
            <Button
              onClick={handleNextStep}
              disabled={!selectedArea}
              className="bg-black text-white py-2 px-4 border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("nextSelectTemplate")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Template Selection */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("selectTemplate")}</h2>
          <p className="text-gray-600">
            {t("selectTemplateDescription")}
          </p>

          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelected={setSelectedTemplate}
          />

          <div className="flex justify-between mt-6">
            <Button
              onClick={handlePrevStep}
              className="bg-white text-black py-2 px-4 border-2 border-black hover:bg-gray-100 transition-colors"
            >
              {t("back")}
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={!selectedTemplate}
              className="bg-black text-white py-2 px-4 border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("nextTestQuery")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Query Testing */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("testYourQuery")}</h2>
          <p className="text-gray-600">
            {t("testQueryDescription")}
          </p>

          <QueryTester
            selectedArea={selectedArea}
            selectedTemplate={templates.find((t) => t.id === selectedTemplate)}
          />

          <div className="flex justify-between mt-6">
            <Button
              onClick={handlePrevStep}
              className="bg-white text-black py-2 px-4 border-2 border-black hover:bg-gray-100 transition-colors"
            >
              {t("back")}
            </Button>
            <Button
              onClick={handleNextStep}
              className="bg-black text-white py-2 px-4 border-2 border-black hover:bg-white hover:text-black transition-colors"
            >
              {t("nextConfirm")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("confirmDatasetCreation")}</h2>
          <p className="text-gray-600">
            {t("confirmDescription")}
          </p>

          <div className="border border-gray-200 p-4 rounded-md space-y-3">
            <div>
              <h3 className="font-medium">{t("selectedArea")}</h3>
              <p>{selectedArea?.displayName}</p>
            </div>

            <div>
              <h3 className="font-medium">{t("selectedTemplate")}</h3>
              <p>
                {templates.find((t) => t.id === selectedTemplate)?.name || ""}
              </p>
              <p className="text-sm text-gray-500">
                {templates.find((t) => t.id === selectedTemplate)
                  ?.description || ""}
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              onClick={handlePrevStep}
              className="bg-white text-black py-2 px-4 border-2 border-black hover:bg-gray-100 transition-colors"
            >
              {t("back")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-black text-white py-2 px-4 border-2 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Dataset"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
