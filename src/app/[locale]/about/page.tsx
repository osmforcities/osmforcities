import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const link = (href: string, children: React.ReactNode) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
  >
    {children}
  </a>
);

const AboutPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AboutPage");

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("backToHome")}
              </Link>
            </Button>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white mb-6">
                {t("title")}
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {t("description1")}
              </p>
            </div>

            <div>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {t("description2")}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
                {t("featureHighlights")}
              </h2>

              <ul className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <li>• {t("feature1")}</li>
                <li>• {t("feature2")}</li>
                <li>• {t("feature3")}</li>
                <li>• {t("feature4")}</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
                {t("theExperiment")}
              </h2>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                {t.rich("experiment1", {
                  vitorLink: (chunks) =>
                    link("https://github.com/vgeorge", chunks),
                  devSeedLink: (chunks) =>
                    link("https://developmentseed.org", chunks),
                })}
              </p>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {t.rich("experiment2", {
                  githubLink: (chunks) =>
                    link(
                      "https://github.com/osmforcities/osmforcities",
                      chunks
                    ),
                })}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
                {t("getInvolved")}
              </h2>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                {t("getInvolvedDescription")}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <a
                    href="https://forms.gle/RGZdZ1mzo4hZx5g27"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    {t("shareFeedback")}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>

                <Button variant="outline" asChild>
                  <a
                    href="https://github.com/osmforcities/osmforcities"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    {t("viewOnGitHub")}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
