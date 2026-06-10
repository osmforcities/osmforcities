"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown } from "lucide-react";
import { scrollToSection } from "../shared/scroll-to-section";

export function HeroContent() {
  const t = useTranslations("Home");

  return (
    <div className="flex flex-col justify-center md:border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black relative md:py-16 md:px-14 py-4 px-3 md:flex-shrink-0 md:min-h-0">
      <div style={{ maxWidth: '480px' }}>
        <h1
          className="font-medium text-neutral-900 dark:text-neutral-100 md:mb-6 mb-1"
          style={{
            fontSize: 'clamp(18px, 5vw, 32px)',
            lineHeight: '1.1',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          {t("hero.title")}
        </h1>
        <p
          className="text-neutral-600 dark:text-neutral-400"
          style={{
            fontSize: 'clamp(13px, 2.5vw, 15px)',
            lineHeight: '1.5',
            textWrap: 'pretty',
          }}
        >
          {t("hero.description")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 md:mt-8">
          <Button
            asChild
            size="lg"
            variant="primary"
          >
            <Link href="/explore" className="gap-2">
              {t("hero.exploreDatasets")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => scrollToSection("features")}
            className="gap-2"
          >
            {t("hero.seeHowItWorks")}
            <ArrowDown className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
