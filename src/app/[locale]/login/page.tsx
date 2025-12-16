import { Metadata } from "next";
import LoginForm from "./login-form";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Locale } from "next-intl";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign In - Test Environment",
    description: "Sign in page for testing purposes",
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("EnterPage");

  if (process.env.ENABLE_TEST_AUTH !== "true") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {t("notFound")}
          </h1>
          <p className="text-gray-600 mt-2">
            {t("testAuthNotEnabled")}
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
              {t("signIn")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t("signInWithEmailPassword")}
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
