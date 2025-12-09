"use client";

import { useTranslations } from "next-intl";
import { SectionWrapper, SectionHeader } from "../shared/section-wrapper";
import { GridWrapper } from "../shared/grid-wrapper";
import { USE_CASE_ICONS } from "../shared/icon-config";
import { UseCaseItem } from "../shared/types";
import { CategoryCard } from "../shared/category-card";

export function UseCases() {
  const t = useTranslations("Home.useCases");

  // Use cases from product specification
  const useCases: UseCaseItem[] = [
    {
      id: "urbanPlanners",
      icon: USE_CASE_ICONS.urbanPlanners,
      category: t("urbanPlanners.category"),
      title: t("urbanPlanners.title"),
      description: t("urbanPlanners.description"),
    },
    {
      id: "journalists",
      icon: USE_CASE_ICONS.journalists,
      category: t("journalists.category"),
      title: t("journalists.title"),
      description: t("journalists.description"),
    },
    {
      id: "researchers",
      icon: USE_CASE_ICONS.researchers,
      category: t("researchers.category"),
      title: t("researchers.title"),
      description: t("researchers.description"),
    },
    {
      id: "developers",
      icon: USE_CASE_ICONS.developers,
      category: t("developers.category"),
      title: t("developers.title"),
      description: t("developers.description"),
    },
    {
      id: "communityGroups",
      icon: USE_CASE_ICONS.communityGroups,
      category: t("communityGroups.category"),
      title: t("communityGroups.title"),
      description: t("communityGroups.description"),
    },
    {
      id: "publicInstitutions",
      icon: USE_CASE_ICONS.publicInstitutions,
      category: t("publicInstitutions.category"),
      title: t("publicInstitutions.title"),
      description: t("publicInstitutions.description"),
    },
    {
      id: "residents",
      icon: USE_CASE_ICONS.residents,
      category: t("residents.category"),
      title: t("residents.title"),
      description: t("residents.description"),
    },
    {
      id: "businesses",
      icon: USE_CASE_ICONS.businesses,
      category: t("businesses.category"),
      title: t("businesses.title"),
      description: t("businesses.description"),
    },
  ];

  return (
    <SectionWrapper>
      <SectionHeader
        subtitle={t("subtitle")}
        title={t("title")}
        description={t("description")}
      />

      {/* Use cases grid */}
      <GridWrapper columns={2} maxWidth="md">
        {useCases.map((useCase) => (
          <CategoryCard
            key={useCase.id}
            icon={useCase.icon}
            category={useCase.category}
            title={useCase.title}
            description={useCase.description}
            variant="default"
          />
        ))}
      </GridWrapper>
    </SectionWrapper>
  );
}
