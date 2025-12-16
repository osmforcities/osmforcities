"use client";

import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui/heading";
import { SectionWrapper, SectionHeader } from "../shared/section-wrapper";
import { FEATURE_ICONS } from "../shared/icon-config";
import { FeatureItem } from "../shared/types";
import { TextWithLink } from "../shared/text-with-link";

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
        <Heading as="h3" level="h3" spacing="sm">
          {feature.title}
        </Heading>
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

      <div className="max-w-3xl mx-auto space-y-8">
        {features.map((feature) => (
          <FeatureItemComponent
            key={feature.id}
            feature={feature}
            licenseLink={
              feature.id === "download" ? t("download.licenseLink") : undefined
            }
          />
        ))}
      </div>
    </SectionWrapper>
  );
}
