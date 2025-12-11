"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { SectionWrapper } from "../shared/section-wrapper";
import { scrollToSection } from "../shared/scroll-to-section";
import { HeroMap } from "../shared/hero-map";

export function Hero() {
  const t = useTranslations("Home");

  return (
    <SectionWrapper className="py-12 md:py-16 lg:py-20">
      <div className="grid grid-cols-1 border border-gray-200 dark:border-gray-800 lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 md:p-12">
          <h1 className="mb-5 text-5xl font-bold md:mb-6 md:text-6xl lg:text-7xl text-black dark:text-white">
            {t("hero.title")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t("hero.description")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 md:mt-8">
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection("features")}
              className="gap-2"
            >
              {t("hero.seeHowItWorks")}
              <ArrowDown className="size-4" />
            </Button>
          </div>
        </div>
        <HeroMap />
      </div>
    </SectionWrapper>
  );
}
