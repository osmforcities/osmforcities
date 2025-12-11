"use client";

import { useTranslations } from "next-intl";
import { SectionWrapper, SectionHeader } from "../shared/section-wrapper";
import { GridWrapper } from "../shared/grid-wrapper";
import { DATASET_ICONS } from "../shared/icon-config";
import { DatasetCategory } from "../shared/types";
import { CategoryCard, categoryColors } from "../shared";

export function DatasetShowcase() {
  const t = useTranslations("Home");

  // Real template categories from the database
  const categories: DatasetCategory[] = [
    {
      id: "healthcare",
      icon: DATASET_ICONS.healthcare,
      category: t("showcase.datasets.healthcare.category"),
      title: t("showcase.datasets.healthcare.title"),
      description: t("showcase.datasets.healthcare.description"),
    },
    {
      id: "transportation",
      icon: DATASET_ICONS.transportation,
      category: t("showcase.datasets.transportation.category"),
      title: t("showcase.datasets.transportation.title"),
      description: t("showcase.datasets.transportation.description"),
    },
    {
      id: "education",
      icon: DATASET_ICONS.education,
      category: t("showcase.datasets.education.category"),
      title: t("showcase.datasets.education.title"),
      description: t("showcase.datasets.education.description"),
    },
    {
      id: "leisure",
      icon: DATASET_ICONS.leisure,
      category: t("showcase.datasets.leisure.category"),
      title: t("showcase.datasets.leisure.title"),
      description: t("showcase.datasets.leisure.description"),
    },
    {
      id: "amenities",
      icon: DATASET_ICONS.amenities,
      category: t("showcase.datasets.amenities.category"),
      title: t("showcase.datasets.amenities.title"),
      description: t("showcase.datasets.amenities.description"),
    },
    {
      id: "environment",
      icon: DATASET_ICONS.environment,
      category: t("showcase.datasets.environment.category"),
      title: t("showcase.datasets.environment.title"),
      description: t("showcase.datasets.environment.description"),
    },
    {
      id: "tourism",
      icon: DATASET_ICONS.tourism,
      category: t("showcase.datasets.tourism.category"),
      title: t("showcase.datasets.tourism.title"),
      description: t("showcase.datasets.tourism.description"),
    },
    {
      id: "culture",
      icon: DATASET_ICONS.culture,
      category: t("showcase.datasets.culture.category"),
      title: t("showcase.datasets.culture.title"),
      description: t("showcase.datasets.culture.description"),
    },
    {
      id: "social",
      icon: DATASET_ICONS.social,
      category: t("showcase.datasets.social.category"),
      title: t("showcase.datasets.social.title"),
      description: t("showcase.datasets.social.description"),
    },
  ];

  return (
    <SectionWrapper dataSection="showcase">
      <SectionHeader
        subtitle={t("showcase.subtitle")}
        title={t("showcase.title")}
        description={t("showcase.description")}
      />

      {/* Category grid */}
      <GridWrapper columns={3} maxWidth="lg">
        {categories.map((category, index) => (
          <CategoryCard
            key={category.id}
            icon={category.icon}
            category={category.category}
            title={category.title}
            description={category.description}
            variant="showcase"
            colorVariant={categoryColors[index]}
          />
        ))}
      </GridWrapper>
    </SectionWrapper>
  );
}
