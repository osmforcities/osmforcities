"use client";

import { useTranslations } from "next-intl";
import { Map } from "lucide-react";
import { SectionWrapper, SectionHeader } from "../shared/section-wrapper";
import { FEATURE_ICONS } from "../shared/icon-config";
import { FeatureItem } from "../shared/types";
import { TextWithLink } from "../shared/text-with-link";

// Extracted visual component for reusability
function FeaturesVisual() {
  // Get all icons from our config
  const iconComponents = Object.values(FEATURE_ICONS);

  return (
    <div className="w-full aspect-square bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
      <div className="w-full h-full flex items-center justify-center">
        <div className="relative">
          {/* Background grid pattern */}
          <div className="absolute inset-0 -m-12 grid grid-cols-3 gap-8 opacity-20">
            {iconComponents.map((Icon, index) => (
              <Icon key={index} className="size-12 text-gray-600 dark:text-gray-400" />
            ))}
            {iconComponents.slice(0, 1).map((Icon, index) => (
              <Icon key={`extra-${index}`} className="size-12 text-gray-600 dark:text-gray-400" />
            ))}
          </div>

          {/* Central highlighted feature */}
          <div className="relative flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 rounded-full p-6 border-2 border-blue-600 shadow-lg">
              <Map className="size-16 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feature item component for consistent styling
function FeatureItemComponent({
  feature,
  licenseLink,
}: {
  feature: FeatureItem;
  licenseLink?: string;
}) {
  const Icon = feature.icon;

  return (
    <div className="flex gap-4 group">
      <div className="flex-shrink-0">
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
          <Icon className="size-6 text-blue-600" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-bold md:text-2xl text-black dark:text-white">
          {feature.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {licenseLink && feature.description.includes("(ODbL)") ? (
            <TextWithLink
              text={feature.description}
              linkText="(ODbL)"
              linkHref={licenseLink}
            />
          ) : (
            feature.description
          )}
        </p>
      </div>
    </div>
  );
}

export function Features() {
  const t = useTranslations("Home.features");

  // Centralized feature data for easier maintenance
  const features: FeatureItem[] = [
    {
      id: "curate",
      icon: FEATURE_ICONS.curate,
      title: t("curate.title"),
      description: t("curate.description"),
    },
    {
      id: "notifications",
      icon: FEATURE_ICONS.notifications,
      title: t("notifications.title"),
      description: t("notifications.description"),
    },
    {
      id: "inspect",
      icon: FEATURE_ICONS.inspect,
      title: t("inspect.title"),
      description: t("inspect.description"),
    },
    {
      id: "download",
      icon: FEATURE_ICONS.download,
      title: t("download.title"),
      description: t("download.description"),
    },
  ];

  return (
    <SectionWrapper dataSection="features">
      <SectionHeader
        subtitle={t("subtitle")}
        title={t("title")}
        description={t("description")}
      />

      <div className="grid grid-cols-1 items-center gap-16 lg:gap-x-20 lg:grid-cols-2">
        {/* Fixed visual on the left */}
        <div className="order-last flex items-center justify-center">
          <FeaturesVisual />
        </div>

        {/* Feature list on the right */}
        <div className="order-first space-y-8 lg:order-last">
          {features.map((feature) => (
            <FeatureItemComponent
              key={feature.id}
              feature={feature}
              licenseLink={feature.id === "download" ? t("download.licenseLink") : undefined}
            />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
