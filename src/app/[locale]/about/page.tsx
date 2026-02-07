import { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";
import { routing } from "@/i18n/routing";
import { GITHUB_REPO_URL, CONTACT_FORM_URL } from "@/lib/constants";
import { auth } from "@/auth";
import AboutContent from "@/components/about-content";

const metadataMap = {
  en: {
    title: "About - OSM for Cities",
    description:
      "Learn about OSM for Cities - Daily updated datasets from OpenStreetMap",
  },
  "pt-BR": {
    title: "Sobre - OSM for Cities",
    description:
      "Saiba mais sobre OSM for Cities - Conjuntos de dados atualizados diariamente do OpenStreetMap",
  },
  es: {
    title: "Acerca de - OSM for Cities",
    description:
      "Conoce OSM for Cities - Conjuntos de datos actualizados diariamente de OpenStreetMap",
  },
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataMap[locale] || metadataMap.en;
}

const AboutPage = async ({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session?.user || null;
  const tDataset = await getTranslations("DatasetList");
  const tCommon = await getTranslations("Common");

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={user ? "/dashboard" : "/"}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {tDataset("backToHome")}
              </Link>
            </Button>
          </div>

          <AboutContent />

          <div className="mt-8">
            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <a
                  href={CONTACT_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  {tCommon("shareFeedback")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>

              <Button variant="outline" asChild>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  {tCommon("viewOnGitHub")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
