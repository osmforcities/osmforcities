"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Link } from "@/i18n/navigation";
import { SectionWrapper } from "../shared/section-wrapper";

export function FinalCTA() {
  const t = useTranslations("Home");

  return (
    <SectionWrapper>
      <div className="flex flex-col items-center border border-gray-200 dark:border-gray-800 p-8 md:p-12 lg:p-16 rounded-lg">
        <div className="max-w-lg text-center">
          <Heading as="h2" level="h2-xl">
            {t("signup.title")}
          </Heading>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
            {t("signup.description")}
          </p>
        </div>
        <div className="mx-auto mt-6 max-w-sm w-full md:mt-8">
          <div className="flex justify-center">
            <Button variant="primary" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/login">{t("signup.signUp")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
