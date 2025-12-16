import { Metadata } from "next";
import SignupForm from "./signup-form";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Locale } from "next-intl";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign Up - Test Environment",
    description: "Sign up page for testing purposes",
  };
}

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("EnterPage");

  // Only show this page in test or development environment
  if (
    process.env.NODE_ENV !== "test" &&
    process.env.NODE_ENV !== "development"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {t("notFound")}
          </h1>
          <p className="text-gray-600 mt-2">
            {t("testEnvOnly")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="flex flex-col items-center justify-center p-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-black dark:text-white">
              {t("createAccount")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t("signupForTesting")}
            </p>
          </div>

          <SignupForm />
        </div>
      </div>
    </div>
  );
}
